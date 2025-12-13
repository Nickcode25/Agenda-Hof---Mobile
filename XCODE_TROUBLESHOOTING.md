# 🔧 Troubleshooting: Instalação do Xcode

## Data: 2025-12-12

---

## ℹ️ Informações do Sistema

- **macOS:** 15.7.3 (Sequoia) ✅
- **Espaço livre:** 267 GB ✅
- **Espaço necessário:** ~15 GB para Xcode

---

## 🚨 Erros Comuns e Soluções

### Erro 1: "Não Consigo Encontrar Xcode na App Store"

**Solução:**
1. Abra a **App Store**
2. **Faça logout** da sua conta Apple:
   - Menu superior: App Store → Sign Out
3. **Faça login novamente**
4. Busque "Xcode" novamente
5. Deve aparecer com botão "Obter" ou "Baixar"

---

### Erro 2: "Download Fica Travado ou Muito Lento"

**Causas comuns:**
- Internet lenta/instável
- Servidor da Apple sobrecarregado
- Problema de cache da App Store

**Soluções:**

**A) Reiniciar Download:**
1. Cancele o download atual
2. Reinicie o Mac
3. Tente novamente

**B) Limpar Cache da App Store:**
```bash
# No Terminal:
rm -rf ~/Library/Caches/com.apple.appstore
killall App\ Store
```
Depois abra a App Store novamente

**C) Download Alternativo (Mais Rápido):**
1. Acesse: https://developer.apple.com/download/all/
2. Faça login com seu Apple ID
3. Busque "Xcode 16" (versão atual para macOS 15)
4. Baixe o arquivo `.xip` (~8 GB)
5. Após download, **clique duas vezes** no arquivo para extrair
6. Mova o Xcode.app para a pasta **Applications**
7. Abra o Xcode e aceite os termos

---

### Erro 3: "Não Tenho Espaço Suficiente"

**Você tem 267 GB livres ✅** - Não é seu caso!

Mas se precisar liberar espaço:
```bash
# Ver o que está ocupando espaço
du -sh ~/Library/Caches/*
du -sh ~/Downloads/*

# Limpar cache do sistema (cuidado)
sudo rm -rf /Library/Caches/*
```

---

### Erro 4: "Instalação Falha ou Para no Meio"

**Solução:**
1. Deletar Xcode parcialmente instalado:
   ```bash
   sudo rm -rf /Applications/Xcode.app
   sudo rm -rf ~/Library/Developer
   ```
2. Reiniciar o Mac
3. Tentar instalar novamente

---

### Erro 5: "Preciso de Senha de Administrador"

Se você não é administrador do Mac:
1. Peça ao administrador para instalar
2. Ou configure sua conta como administrador:
   - System Settings → Users & Groups
   - Desbloqueie (cadeado)
   - Marque "Allow user to administer this computer"

---

## ⚡ Método Alternativo: Instalar Command Line Tools (Mais Leve)

Se você **não precisa do Xcode completo** agora e só quer testar:

```bash
# Instalar apenas ferramentas de linha de comando (2 GB ao invés de 15 GB)
xcode-select --install
```

**Limitações:**
- Não tem interface gráfica do Xcode
- Não pode abrir o projeto visualmente
- **Pode usar para build via terminal:**
  ```bash
  # Build e instalar no iPhone via linha de comando
  cd ios/App
  pod install

  # Listar dispositivos conectados
  xcrun xctrace list devices

  # Build para dispositivo específico
  xcodebuild -workspace App.xcworkspace \
             -scheme App \
             -configuration Debug \
             -destination 'platform=iOS,id=DEVICE_ID' \
             build
  ```

**Recomendação:** Use Command Line Tools apenas para testar se funciona. Para desenvolvimento real e publicação na App Store, você vai precisar do Xcode completo.

---

## 🎯 Método Recomendado: Download Direto da Apple ✅ USADO

**Passo a passo completo:**

### 1. Criar/Fazer Login na Conta Apple Developer (GRATUITO) ✅

Acesse: https://developer.apple.com/

- Não precisa pagar $99/ano ainda
- Use seu Apple ID normal
- Aceite os termos

### 2. Baixar Xcode Direto do Site ✅

1. Acesse: https://developer.apple.com/download/all/ ✅
2. Faça login ✅
3. Busque **"Xcode 16.2"** (versão mais recente para macOS 15) ✅
4. Clique em "View Details" ✅
5. **IMPORTANTE:** Escolha a versão correta:
   - ✅ **"Xcode 26.2 Apple silicon.xip"** (2.10 GB) - RECOMENDADO para M1/M2/M3
   - ❌ "Xcode 26.2 Universal.xip" (2.66 GB) - Apenas se precisar suportar Intel
6. Clique em **"Download"** no arquivo `.xip`
7. **Tamanho:** 2.10 GB (Apple Silicon)
8. **Tempo:** 5-30 minutos (dependendo da internet)

### 3. Instalar o Xcode

1. **Aguarde** o download completar (arquivo .xip na pasta Downloads)
2. **Clique duas vezes** no arquivo `Xcode_16.2.xip`
3. Sistema vai **extrair automaticamente** (demora 10-20 min)
4. Após extrair, aparece `Xcode.app`
5. **Arraste** `Xcode.app` para a pasta **Applications**
6. **Abra** o Xcode (pode demorar na primeira vez)
7. **Aceite** os termos de licença
8. **Aguarde** instalação de componentes adicionais

### 4. Configurar Command Line Tools

```bash
# No Terminal:
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
```

Digite sua senha quando solicitado.

### 5. Verificar Instalação

```bash
xcodebuild -version
```

Deve mostrar:
```
Xcode 16.2
Build version 16C5032a
```

---

## 🐛 Erros Específicos Durante Uso

### "xcode-select: error: tool 'xcodebuild' requires Xcode"

**Solução:**
```bash
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -license accept
```

### "Developer Mode Disabled" no iPhone

**No iPhone (iOS 16+):**
1. Ajustes
2. Privacidade e Segurança
3. Developer Mode → **Ativar**
4. **Reiniciar** iPhone
5. Confirmar ativação após reiniciar

### "Code Signing Failed"

**No Xcode:**
1. Target "App"
2. Signing & Capabilities
3. Team: Adicione seu Apple ID
4. Bundle Identifier: Mude para algo único
   - Ex: `com.seunome.agendahof.mobile`

### "Could not find Developer Disk Image"

Seu iPhone está com iOS muito novo ou muito antigo para a versão do Xcode.

**Solução:**
- Atualize o Xcode para versão mais recente
- OU atualize o iOS do iPhone

---

## 📞 Checklist de Instalação

Marque conforme completa:

- [ ] macOS 15.7.3 ou superior ✅ (você tem)
- [ ] 15 GB de espaço livre ✅ (você tem 267 GB)
- [ ] Apple ID criado ✅
- [ ] Xcode baixado
- [ ] Xcode extraído e movido para Applications
- [ ] Xcode aberto pela primeira vez
- [ ] Termos de licença aceitos
- [ ] Componentes adicionais instalados
- [ ] Command Line Tools configurados
- [ ] Comando `xcodebuild -version` funciona

---

## 🚀 Próximos Passos Após Instalar Xcode

```bash
# 1. Voltar para pasta do projeto
cd /Volumes/Untitled/Agenda-Hof---Mobile

# 2. Instalar CocoaPods
sudo gem install cocoapods

# 3. Build do projeto
npm run build

# 4. Sync com iOS
npx cap sync ios

# 5. Instalar dependências nativas
cd ios/App
pod install
cd ../..

# 6. Abrir no Xcode
npx cap open ios
```

---

## 💡 Dica: Testar Sem iPhone Físico (Simulador)

Se você quiser testar sem conectar o iPhone:

1. Abra o Xcode
2. No topo, selecione **iPhone 15 Pro** (simulador)
3. Clique em **Play (▶️)**
4. Simulador abre automaticamente
5. App roda no simulador

**Limitações do Simulador:**
- ❌ Não testa Apple Pay (precisa device real)
- ❌ Não testa notificações push reais
- ❌ Não testa câmera
- ✅ Testa toda a UI e fluxos
- ✅ Muito mais rápido para desenvolvimento

---

## 📊 Comparação de Métodos

| Método | Tamanho | Tempo | Recomendado |
|--------|---------|-------|-------------|
| **App Store** | 15 GB | 2-4h | ⭐⭐⭐ Fácil |
| **Download Direto** | 8 GB | 1-2h | ⭐⭐⭐⭐⭐ Rápido |
| **Command Line Tools** | 2 GB | 15min | ⭐⭐ Limitado |

---

## 🆘 Ainda Com Problemas?

**Me avise qual erro específico você está tendo:**

1. Print do erro (se aparecer mensagem)
2. Em que etapa travou:
   - [ ] Não acha Xcode na App Store
   - [ ] Download não inicia
   - [ ] Download trava
   - [ ] Instalação falha
   - [ ] Xcode não abre
   - [ ] Outro erro

**Informações úteis para debug:**
```bash
# Versão do macOS
sw_vers

# Espaço disponível
df -h /

# Verificar se já tem algo do Xcode
ls -la /Applications/ | grep -i xcode
xcode-select -p
```

---

**RECOMENDAÇÃO:** Use o **download direto** do site da Apple (https://developer.apple.com/download/all/) - é mais rápido e confiável!
