const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ Conectado ao MongoDB');
    
    // Listar todas as coleções
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n📁 Coleções encontradas:');
    collections.forEach(c => console.log('  -', c.name));
    
    // Verificar arquivos no GridFS
    const files = mongoose.connection.db.collection('whatsapp-RemoteAuth-tina-bot.files');
    const filesList = await files.find({}).toArray();
    
    console.log('\n💾 Arquivos no GridFS:', filesList.length);
    if (filesList.length > 0) {
      console.log('\nDetalhes dos arquivos:');
      filesList.forEach(file => {
        console.log(`  - ${file.filename} (${file.length} bytes)`);
      });
    } else {
      console.log('⚠️  Nenhum arquivo salvo ainda. Aguarde o bot autenticar completamente.');
    }
    
    // Verificar chunks
    const chunks = mongoose.connection.db.collection('whatsapp-RemoteAuth-tina-bot.chunks');
    const chunksList = await chunks.find({}).toArray();
    console.log('📦 Chunks salvos:', chunksList.length);
    
    mongoose.connection.close();
  })
  .catch(err => {
    console.error('❌ Erro:', err);
    process.exit(1);
  });