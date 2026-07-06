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

  // Change enum types inside models to String
  schema = schema.replace(/(\s+type\s+)GoalType/g, '$1String');
  schema = schema.replace(/(\s+status\s+)TaskStatus/g, '$1String');
  schema = schema.replace(/(\s+priority\s+)Priority/g, '$1String');
  schema = schema.replace(/(\s+status\s+)BookStatus/g, '$1String');
  schema = schema.replace(/(\s+platform\s+)Platform/g, '$1String');

  // Change default enum values to quoted strings
  schema = schema.replace(/@default\(TODO\)/g, '@default("TODO")');
  schema = schema.replace(/@default\(MEDIUM\)/g, '@default("MEDIUM")');
  schema = schema.replace(/@default\(WANT_TO_READ\)/g, '@default("WANT_TO_READ")');

  // Comment out enum definitions
  schema = schema.replace(/(enum\s+\w+\s+\{[\s\S]*?\})/g, '/*\n$1\n*/');

  // Update .env file
  env = env.replace(
    /DATABASE_URL\s*=\s*".*"/g,
    'DATABASE_URL="file:./dev.db"'
  );

  console.log('✅ SQLite configurations prepared.');
} else {
  console.log('🐘 Switching database provider to PostgreSQL...');

  // Change provider
  schema = schema.replace(/provider\s*=\s*"sqlite"/g, 'provider = "postgresql"');

  // Revert String types back to Enums
  schema = schema.replace(/(\s+type\s+)String/g, '$1GoalType');
  schema = schema.replace(/(\s+status\s+)String/g, '$1TaskStatus');
  schema = schema.replace(/(\s+priority\s+)String/g, '$1Priority');
  schema = schema.replace(/(\s+status\s+)String/g, '$1BookStatus');
  schema = schema.replace(/(\s+platform\s+)String/g, '$1Platform');

  // Revert quoted default values back to enum identifiers
  schema = schema.replace(/@default\("TODO"\)/g, '@default(TODO)');
  schema = schema.replace(/@default\("MEDIUM"\)/g, '@default(MEDIUM)');
  schema = schema.replace(/@default\("WANT_TO_READ"\)/g, '@default(WANT_TO_READ)');

  // Fix specific edge case mappings where String might be used elsewhere
  // Since we replaced all of them, let's make sure things like 'frequency String' or 'content String' are not broke.
  // Actually, we used targeted regex mapping like `\s+type\s+` which only matches the specific fields.
  // Let's restore the commented out enums
  schema = schema.replace(/\/\*\s*\n(enum\s+\w+\s+\{[\s\S]*?\})\s*\n\*\//g, '$1');

  // Update .env file
  env = env.replace(
    /DATABASE_URL\s*=\s*".*"/g,
    'DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/growthos_db?schema=public"'
  );

  console.log('✅ PostgreSQL configurations prepared.');
}

fs.writeFileSync(schemaPath, schema, 'utf8');
fs.writeFileSync(envPath, env, 'utf8');
console.log('🎉 DB Switch completed successfully.');
