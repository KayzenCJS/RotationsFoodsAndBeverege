// Restaura y amplia los CHECK de employees en foods Y retail:
//   group_id -> A, B, C, D y "sin grupo" (espacio)
//   role     -> los 8 roles anteriores + 'admin'
// Se aplica en los dos esquemas para que el dominio sea el mismo.
// Es idempotente: se puede ejecutar varias veces.
const db = require('./db');

const CHECKS = [
  {
    conname: 'employees_group_id_check',
    expr: "group_id = ANY (ARRAY['A'::bpchar, 'B'::bpchar, 'C'::bpchar, 'D'::bpchar, ' '::bpchar])"
  },
  {
    conname: 'employees_role_check',
    expr: "((role)::text = ANY ((ARRAY['server'::character varying, 'cashier'::character varying, " +
          "'dishwasher'::character varying, 'cook'::character varying, 'bartender'::character varying, " +
          "'assistant-supervisor'::character varying, 'supervisor'::character varying, 'op'::character varying, " +
          "'admin'::character varying])::text[]))"
  }
];

(async () => {
  let problemas = 0;

  for (const nombre of ['foods', 'retail']) {
    const p = db[nombre];
    const client = await p.connect();
    try {
      await client.query('BEGIN');
      for (const c of CHECKS) {
        const ex = (await client.query(
          'SELECT 1 FROM pg_constraint WHERE conname = $1', [c.conname])).rows.length;
        if (ex) {
          await client.query('ALTER TABLE employees DROP CONSTRAINT ' + c.conname);
          console.log(nombre + ': reemplazado ' + c.conname);
        } else {
          console.log(nombre + ': creado ' + c.conname + ' (no existia)');
        }
        await client.query('ALTER TABLE employees ADD CONSTRAINT ' + c.conname + ' CHECK (' + c.expr + ')');
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      console.error(nombre + ': ERROR, revertido: ' + e.message);
      problemas++;
      client.release();
      await p.end();
      continue;
    }

    const finales = (await client.query(`
      SELECT conname, pg_get_constraintdef(oid) AS def FROM pg_constraint
       WHERE conrelid = 'employees'::regclass AND contype = 'c' ORDER BY conname`)).rows;
    console.log('\n' + nombre + ' -> CHECK verificados en la base de datos:');
    finales.forEach(x => console.log('  ' + x.conname + '\n      ' + x.def));

    const probar = async (sql) => {
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('ROLLBACK');
        return 'aceptado';
      } catch (e) { await client.query('ROLLBACK'); return 'rechazado'; }
    };
    console.log('\n  prueba del dominio (' + nombre + '):');
    const casos = [
      ["group_id='D'", "UPDATE employees SET group_id='D' WHERE id=(SELECT min(id) FROM employees)", true],
      ["group_id=' ' (sin grupo)", "UPDATE employees SET group_id=' ' WHERE id=(SELECT min(id) FROM employees)", true],
      ["group_id='X' (inventado)", "UPDATE employees SET group_id='X' WHERE id=(SELECT min(id) FROM employees)", false],
      ["role='admin'", "UPDATE employees SET role='admin' WHERE id=(SELECT min(id) FROM employees)", true],
      ["role='inventado'", "UPDATE employees SET role='inventado' WHERE id=(SELECT min(id) FROM employees)", false]
    ];
    // Si la tabla esta vacia el UPDATE no toca ninguna fila y el CHECK no llega
    // a evaluarse: en ese caso solo se comprueba la definicion del CHECK.
    const hayFilas = (await client.query('SELECT 1 FROM employees LIMIT 1')).rows.length > 0;
    const defG = (finales.find(x => x.conname === 'employees_group_id_check') || {}).def || '';
    const defR = (finales.find(x => x.conname === 'employees_role_check') || {}).def || '';
    for (const [etiqueta, sql, debe] of casos) {
      let r, evaluado;
      if (hayFilas) {
        r = await probar(sql);
        evaluado = 'ok';
      } else {
        // Sin filas solo se puede comprobar el texto del CHECK.
        r = etiqueta.includes('group_id')
          ? (/'D'/.test(defG) && /' '::bpchar/.test(defG) === debe && /'X'/.test(defG) === !debe ? 'aceptado' : 'rechazado')
          : (/admin/.test(defR) === debe && /inventado/.test(defR) === false ? 'aceptado' : 'rechazado');
        evaluado = 'def';
      }
      const bien = (r === 'aceptado') === debe;
      if (!bien) problemas++;
      console.log('    ' + (bien ? 'ok  ' : 'MAL ') + etiqueta.padEnd(26) + r +
        (evaluado === 'def' ? '  (comprobado sobre la definicion: la tabla esta vacia)' : ''));
    }
    client.release();
    await p.end();
  }

  console.log('\n' + (problemas ? 'HAY ' + problemas + ' PROBLEMAS' : 'Dominio igualado en foods y retail.'));
  process.exit(problemas ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });