#!/bin/bash

echo "🎯 Configurando Xcode para desenvolvimento iOS..."
echo ""

# 1. Configurar Command Line Tools
echo "1️⃣ Configurando Command Line Tools..."
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer

# 2. Aceitar licença do Xcode
echo ""
echo "2️⃣ Aceitando licença do Xcode..."
sudo xcodebuild -license accept

# 3. Verificar instalação do CocoaPods
echo ""
echo "3️⃣ Instalando CocoaPods..."
if ! gem list cocoapods -i > /dev/null 2>&1; then
  sudo gem install cocoapods
else
  echo "✅ CocoaPods já instalado!"
fi

# 4. Build do projeto
echo ""
echo "4️⃣ Fazendo build do projeto..."
cd /Volumes/Untitled/Agenda-Hof---Mobile
npm run build

# 5. Sync com iOS
echo ""
echo "5️⃣ Sincronizando com iOS..."
npx cap sync ios

# 6. Instalar pods
echo ""
echo "6️⃣ Instalando dependências iOS (pods)..."
cd ios/App
pod install
cd ../..

echo ""
echo "✅ ✅ ✅ TUDO PRONTO! ✅ ✅ ✅"
echo ""
echo "🚀 Para abrir o projeto no Xcode, execute:"
echo "   npx cap open ios"
echo ""
echo "📱 Depois conecte seu iPhone e rode o app!"
