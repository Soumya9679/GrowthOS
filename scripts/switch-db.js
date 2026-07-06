const fs = require('fs');
const path = require('path');

const target = process.argv[2]; // 'sqlite' or 'postgres'

if (!target || (target !== 'sqlite' && target !== 'postgres')) {
  console.error('❌ Please specify a target database: "sqlite" or "postgres"');
  process.exit(1);
}

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
const envPath = path.join(__dirname, '..', '.env');

if (!fs.existsSync(schemaPath)) {
  console.error('❌ schema.prisma not found at:', schemaPath);
  process.exit(1);
}

let schema = fs.readFileSync(schemaPath, 'utf8');
let env = fs.readFileSync(envPath, 'utf8');

if (target === 'sqlite') {
  console.log('⚡ Switching database provider to SQLite...');

  // Change provider
  schema = schema.replace(/provider\s*=\s*"postgresql"/g, 'provider = "sqlite"');

  // Change model field types specifically (prevents collision)
  schema = schema.replace(/type\s+GoalType/g, 'type        String');
  schema = schema.replace(/status\s+GoalStatus\s+@default\(ACTIVE\)/g, 'status      String     @default("ACTIVE")');
  schema = schema.replace(/status\s+TaskStatus\s+@default\(TODO\)/g, 'status      String     @default("TODO")');
  schema = schema.replace(/priority\s+Priority\s+@default\(MEDIUM\)/g, 'priority    String     @default("MEDIUM")');
  schema = schema.replace(/status\s+BookStatus\s+@default\(WANT_TO_READ\)/g, 'status      String     @default("WANT_TO_READ")');

  // Comment out enums in schema
  schema = schema.replace(/(enum\s+GoalType\s+\{[\s\S]*?\})/g, '/*\n$1\n*/');
  schema = schema.replace(/(enum\s+GoalStatus\s+\{[\s\S]*?\})/g, '/*\n$1\n*/');
  schema = schema.replace(/(enum\s+TaskStatus\s+\{[\s\S]*?\})/g, '/*\n$1\n*/');
  schema = schema.replace(/(enum\s+Priority\s+\{[\s\S]*?\})/g, '/*\n$1\n*/');
  schema = schema.replace(/(enum\s+BookStatus\s+\{[\s\S]*?\})/g, '/*\n$1\n*/');

  console.log('✅ SQLite configurations prepared.');
} else {
  console.log('🐘 Switching database provider to PostgreSQL...');

  // Change provider
  schema = schema.replace(/provider\s*=\s*"sqlite"/g, 'provider = "postgresql"');

  // Revert model fields back to native Postgres Enums
  schema = schema.replace(/type\s+String/g, 'type        GoalType');
  schema = schema.replace(/status\s+String\s+@default\("ACTIVE"\)/g, 'status      GoalStatus @default(ACTIVE)');
  schema = schema.replace(/status\s+String\s+@default\("TODO"\)/g, 'status      TaskStatus @default(TODO)');
  schema = schema.replace(/priority\s+String\s+@default\("MEDIUM"\)/g, 'priority    Priority @default(MEDIUM)');
  schema = schema.replace(/status\s+String\s+@default\("WANT_TO_READ"\)/g, 'status      BookStatus @default(WANT_TO_READ)');

  // Uncomment enums
  schema = schema.replace(/\/\*\s*\n(enum\s+GoalType\s+\{[\s\S]*?\})\s*\n\*\//g, '$1');
  schema = schema.replace(/\/\*\s*\n(enum\s+GoalStatus\s+\{[\s\S]*?\})\s*\n\*\//g, '$1');
  schema = schema.replace(/\/\*\s*\n(enum\s+TaskStatus\s+\{[\s\S]*?\})\s*\n\*\//g, '$1');
  schema = schema.replace(/\/\*\s*\n(enum\s+Priority\s+\{[\s\S]*?\})\s*\n\*\//g, '$1');
  schema = schema.replace(/\/\*\s*\n(enum\s+BookStatus\s+\{[\s\S]*?\})\s*\n\*\//g, '$1');

  console.log('✅ PostgreSQL configurations prepared.');
}

fs.writeFileSync(schemaPath, schema, 'utf8');
console.log('🎉 DB Switch completed successfully.');
