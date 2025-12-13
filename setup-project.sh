#!/bin/bash

echo "🚀 Configurando projeto na nova localização..."
echo ""

# Navegar para o diretório do projeto
cd /Users/victoriagibrim/Documents/Agenda-Hof---Mobile

echo "📍 Localização atual: $(pwd)"
echo ""

# Instalar dependências npm
echo "1️⃣ Instalando dependências npm..."
npm install

# Build do projeto
echo ""
echo "2️⃣ Fazendo build do projeto..."
npm run build

# Sync com iOS
echo ""
echo "3️⃣ Sincronizando com iOS..."
npx cap sync ios

# Instalar pods
echo ""
echo "4️⃣ Instalando dependências iOS (pods)..."
cd ios/App
pod install
cd ../..

echo ""
echo "✅ ✅ ✅ PROJETO CONFIGURADO COM SUCESSO! ✅ ✅ ✅"
echo ""
echo "📍 Nova localização: /Users/victoriagibrim/Documents/Agenda-Hof---Mobile"
echo ""
echo "🚀 Para abrir no Xcode, execute:"
echo "   cd ~/Documents/Agenda-Hof---Mobile"
echo "   npx cap open ios"
echo ""
echo "📱 Depois conecte seu iPhone e rode o app!"
