const Database=require('better-sqlite3');
const db=new Database('server/data/layout-audit.db',{readonly:true});
console.log('artists:', JSON.stringify(db.prepare("SELECT id,qq_number,name,subdomain,status,template_id,totp_verified,totp_secret FROM artists").all()));
console.log('admin_qq:', JSON.stringify(db.prepare("SELECT value FROM platform_config WHERE key='admin_qq'").all()));
console.log('orders:', db.prepare('SELECT COUNT(*) c FROM orders').get().c);
console.log('workflows:', db.prepare('SELECT COUNT(*) c FROM workflow_templates').get().c);
console.log('artworks:', db.prepare('SELECT COUNT(*) c FROM artworks').get().c);
db.close();
