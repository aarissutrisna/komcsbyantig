import bcrypt from 'bcrypt';
const hash = await bcrypt.hash('admin123', 10);
console.log('HASH_START:' + hash + ':HASH_END');
