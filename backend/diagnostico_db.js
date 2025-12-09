const pool = require('./config/database');

async function diagnosticoCompleto() {
  let client;
  try {
    console.log('🔍 INICIANDO DIAGNÓSTICO COMPLETO...\n');
    
    // Conectar
    client = await pool.connect();
    console.log('✅ Conectado a PostgreSQL');
    
    // 1. Verificar base de datos actual
    const dbResult = await client.query('SELECT current_database()');
    console.log(`📊 Base de datos actual: ${dbResult.rows[0].current_database}`);
    
    // 2. Verificar TODAS las tablas
    const tables = await client.query(`
      SELECT table_name, 
             table_type,
             pg_size_pretty(pg_relation_size('public.' || table_name)) as size
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('\n📋 TABLAS EN LA BASE DE DATOS:');
    if (tables.rows.length === 0) {
      console.log('   ⚠️ No hay tablas en la base de datos');
    } else {
      tables.rows.forEach(table => {
        console.log(`   📁 ${table.table_name} (${table.table_type}) - ${table.size || '0 bytes'}`);
      });
    }
    
    // 3. Verificar específicamente "solicitudes"
    const solicitudesCheck = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'solicitudes'
      ) as existe
    `);
    
    console.log('\n🎯 TABLA "solicitudes" EXISTE:', solicitudesCheck.rows[0].existe);
    
    if (!solicitudesCheck.rows[0].existe) {
      console.log('\n⚠️ La tabla "solicitudes" NO existe. Creándola...');
      
      // Crear tabla solicitudes
      await client.query(`
        CREATE TABLE IF NOT EXISTS solicitudes (
          id SERIAL PRIMARY KEY,
          item_id INTEGER REFERENCES items(id) ON DELETE CASCADE,
          nombre_solicitante VARCHAR(100) NOT NULL,
          email_solicitante VARCHAR(100) NOT NULL,
          telefono_solicitante VARCHAR(20),
          departamento VARCHAR(100),
          motivo TEXT,
          estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_proceso', 'aprobada', 'rechazada', 'completada')),
          notas TEXT,
          fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      console.log('✅ Tabla "solicitudes" creada');
      
      // Crear índices
      await client.query('CREATE INDEX IF NOT EXISTS idx_solicitudes_estado ON solicitudes(estado)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_solicitudes_item ON solicitudes(item_id)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_solicitudes_fecha ON solicitudes(fecha_creacion)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_solicitudes_email ON solicitudes(email_solicitante)');
      
      console.log('✅ Índices creados');
    }
    
    // 4. Verificar tabla "items" (referencia)
    const itemsCheck = await client.query(`
      SELECT COUNT(*) as total_items FROM items
    `);
    console.log(`\n📦 Total de items en la tabla "items": ${itemsCheck.rows[0].total_items}`);
    
    // 5. Verificar permisos del usuario
    const userCheck = await client.query(`
      SELECT current_user, version()
    `);
    console.log(`\n👤 Usuario actual: ${userCheck.rows[0].current_user}`);
    console.log(`🔧 PostgreSQL: ${userCheck.rows[0].version.split(',')[0]}`);
    
    // 6. Probar insert de prueba
    console.log('\n🧪 Probando INSERT en solicitudes...');
    try {
      const testInsert = await client.query(`
        INSERT INTO solicitudes (
          item_id, 
          nombre_solicitante, 
          email_solicitante, 
          motivo,
          estado
        ) VALUES ($1, $2, $3, $4, $5) 
        RETURNING id, fecha_creacion
      `, [1, 'TEST DIAGNOSTICO', 'test@diagnostico.cl', 'Prueba de diagnóstico', 'pendiente']);
      
      console.log(`✅ INSERT exitoso. ID: ${testInsert.rows[0].id}, Fecha: ${testInsert.rows[0].fecha_creacion}`);
      
      // Contar solicitudes
      const countSolicitudes = await client.query('SELECT COUNT(*) as total FROM solicitudes');
      console.log(`📊 Total solicitudes ahora: ${countResult.rows[0].total}`);
      
    } catch (insertError) {
      console.log('❌ Error en INSERT de prueba:', insertError.message);
    }
    
  } catch (error) {
    console.error('\n❌ ERROR EN DIAGNÓSTICO:', error.message);
    console.error('Stack:', error.stack);
    
    if (error.message.includes('relation "items" does not exist')) {
      console.log('\n⚠️ La tabla "items" no existe. ¿Ejecutaste las migraciones iniciales?');
    }
    
  } finally {
    if (client) {
      client.release();
      console.log('\n🔌 Conexión liberada');
    }
    console.log('\n🏁 DIAGNÓSTICO COMPLETADO');
    process.exit(0);
  }
}

diagnosticoCompleto();