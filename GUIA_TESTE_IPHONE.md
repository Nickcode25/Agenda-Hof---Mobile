# 📱 Guia Completo: Testar AgendaHOF no iPhone

## Data: 2025-12-12

---

## 🎯 Objetivo

Testar o aplicativo AgendaHOF Mobile no seu iPhone físico antes de publicar na App Store.

---

## ✅ Pré-requisitos

### 1. **Hardware Necessário**
- ✅ MacBook (você já tem)
- ✅ iPhone físico (qualquer modelo iOS 13+)
- ✅ Cabo USB-C ou Lightning (para conectar iPhone ao Mac)

### 2. **Software Necessário**

#### A. **Xcode** (OBRIGATÓRIO)
- **Status:** ❌ NÃO INSTALADO
- **Como instalar:**
  1. Abra a **App Store** no Mac
  2. Busque por "Xcode"
  3. Clique em "Obter" ou "Instalar"
  4. Aguarde download (~12 GB, pode levar 1-2 horas)
  5. Após instalação, abra o Xcode uma vez para aceitar os termos

#### B. **CocoaPods** (OBRIGATÓRIO)
- **Status:** ❌ NÃO INSTALADO
- **Como instalar:**
  ```bash
  sudo gem install cocoapods
  ```
  - Digite sua senha de administrador quando solicitado

#### C. **Apple Developer Account**
- **Opção 1 (GRATUITA):** Conta pessoal Apple ID
  - Permite testar no seu próprio iPhone
  - Limites: Apps expiram após 7 dias, precisa reinstalar
  - **Ideal para testes iniciais**

- **Opção 2 (PAGA):** Apple Developer Program ($99/ano)
  - Necessário para publicar na App Store
  - Apps não expiram
  - Acesso a TestFlight (beta testing)
  - **Necessário para produção**

---

## 📋 Passo a Passo Detalhado

### **PASSO 1: Instalar Xcode**

1. Abra a **App Store** no Mac
2. Busque "Xcode"
3. Clique em "Obter/Instalar"
4. Aguarde instalação completa (~12 GB)
5. Abra o Xcode pela primeira vez
6. Aceite os termos de licença
7. Aguarde instalação de componentes adicionais

**Tempo estimado:** 1-2 horas (dependendo da internet)

---

### **PASSO 2: Instalar CocoaPods**

Abra o Terminal e execute:

```bash
sudo gem install cocoapods
```

Digite sua senha quando solicitado.

**Verificar instalação:**
```bash
pod --version
```

Deve mostrar algo como: `1.15.2`

---

### **PASSO 3: Configurar Projeto iOS**

No Terminal, navegue até a pasta do projeto:

```bash
cd /Volumes/Untitled/Agenda-Hof---Mobile
```

Execute os comandos:

```bash
# 1. Build do projeto web
npm run build

# 2. Sync com iOS (copia arquivos web para iOS)
npx cap sync ios

# 3. Instalar dependências iOS (CocoaPods)
cd ios/App
pod install
cd ../..
```

**O que isso faz:**
- `npm run build`: Compila o código React para produção
- `npx cap sync ios`: Sincroniza código web com projeto iOS nativo
- `pod install`: Instala dependências nativas iOS (Capacitor plugins)

---

### **PASSO 4: Abrir Projeto no Xcode**

```bash
npx cap open ios
```

Isso vai abrir o projeto no Xcode automaticamente.

**Se não abrir automaticamente:**
1. Abra o Xcode
2. File → Open
3. Navegue até: `/Volumes/Untitled/Agenda-Hof---Mobile/ios/App`
4. Selecione `App.xcworkspace` (⚠️ NÃO abra o .xcodeproj)

---

### **PASSO 5: Configurar Assinatura (Signing)**

No Xcode:

1. **Selecione o projeto "App"** na barra lateral esquerda (ícone azul)
2. Na aba **"Signing & Capabilities"**
3. Em **"Team"**, clique no dropdown:

   **Se você tem Apple Developer Program ($99/ano):**
   - Selecione seu time/organização

   **Se você NÃO tem (teste gratuito):**
   - Clique em "Add Account..."
   - Faça login com seu Apple ID pessoal
   - Após login, selecione seu nome no dropdown "Team"

4. ⚠️ **Bundle Identifier:**
   - O Xcode pode reclamar que o bundle ID já existe
   - Mude para algo único, ex: `com.seunome.agendahof`
   - Anote esse Bundle ID para usar depois na App Store

5. **Automaticamente gerenciar assinatura:**
   - ✅ Marque "Automatically manage signing"

---

### **PASSO 6: Conectar iPhone e Confiar no Mac**

1. **Conecte seu iPhone ao Mac** com cabo USB
2. **No iPhone:**
   - Desbloqueie o celular
   - Pode aparecer um alerta "Confiar neste computador?"
   - Toque em **"Confiar"**
   - Digite a senha do iPhone se solicitado

3. **No Xcode:**
   - No topo da tela, ao lado do botão Play (▶️)
   - Clique no dropdown que mostra dispositivos
   - Selecione seu iPhone (deve aparecer com o nome do seu aparelho)

---

### **PASSO 7: Confiar no Desenvolvedor (iPhone)**

⚠️ **IMPORTANTE:** Como você está usando conta gratuita, precisa confiar manualmente:

1. **No Xcode:** Clique no botão **Play (▶️)** para compilar e instalar
2. **Aguarde** a compilação (pode levar 2-5 minutos na primeira vez)
3. **No iPhone:** O app será instalado, mas NÃO vai abrir
4. **No iPhone, vá em:**
   ```
   Ajustes → Geral → VPN e Gerenciamento de Dispositivos
   ```
5. Toque no seu Apple ID (ou nome do desenvolvedor)
6. Toque em **"Confiar em [seu email]"**
7. Confirme **"Confiar"**

---

### **PASSO 8: Executar o App**

1. **No iPhone:** Toque no ícone do AgendaHOF na tela inicial
2. **O app deve abrir!** 🎉

Se houver erro, volte ao Xcode e veja os logs na área inferior.

---

## 🔧 Workflow de Desenvolvimento

### Fazer Mudanças e Testar:

```bash
# 1. Faça suas alterações no código

# 2. Build do projeto
npm run build

# 3. Sync com iOS
npx cap sync ios

# 4. No Xcode, clique em Play (▶️) novamente
```

### Atalhos do Xcode:
- **⌘ + R**: Run (compilar e executar)
- **⌘ + .**: Stop (parar execução)
- **⌘ + Shift + K**: Clean (limpar build)

---

## 🐛 Troubleshooting

### ❌ "Code Signing Error"
**Causa:** Bundle ID já existe ou problema de assinatura

**Solução:**
1. Mude o Bundle Identifier no Xcode
2. Use formato: `com.seunome.agendahof`
3. Selecione sua conta no Team

---

### ❌ "Pod Install Failed"
**Causa:** CocoaPods não instalado ou desatualizado

**Solução:**
```bash
sudo gem install cocoapods
cd ios/App
pod repo update
pod install
```

---

### ❌ "Developer Mode Disabled" (iOS 16+)
**Causa:** iOS 16+ requer Developer Mode ativado

**Solução no iPhone:**
1. Ajustes → Privacidade e Segurança
2. Developer Mode → Ativar
3. Reiniciar iPhone
4. Confirmar ativação

---

### ❌ App fecha imediatamente ao abrir
**Causa:** Não confiou no desenvolvedor

**Solução:**
1. Ajustes → Geral → VPN e Gerenciamento de Dispositivos
2. Toque no seu perfil
3. Confiar

---

### ❌ "Build Failed" no Xcode
**Causa:** Erros de código ou dependências

**Solução:**
1. Veja os erros na aba "Issue Navigator" (ícone ⚠️ na barra lateral)
2. Rode `npm run build` novamente
3. Clean: ⌘ + Shift + K
4. Rebuild: ⌘ + R

---

## 📝 Checklist de Testes no iPhone

Antes de publicar na App Store, teste:

### Funcionalidades Básicas:
- [ ] Login/Logout funciona
- [ ] Cadastro de novo usuário
- [ ] Reset de senha

### Agenda:
- [ ] Visualização de dia/semana
- [ ] Criar novo agendamento
- [ ] Editar agendamento
- [ ] Cancelar agendamento
- [ ] Scroll suave na timeline
- [ ] Date picker funciona

### Pacientes:
- [ ] Lista de pacientes carrega
- [ ] Busca funciona
- [ ] Scroll alfabético funciona
- [ ] Criar novo paciente
- [ ] Editar paciente
- [ ] Ver detalhes do paciente
- [ ] Importar contatos (permissão)

### Assinatura:
- [ ] Ver planos disponíveis
- [ ] Selecionar plano
- [ ] **Apple Pay funciona** (crítico!)
- [ ] Pagamento com cartão
- [ ] Ver minha assinatura
- [ ] Cancelar assinatura

### Notificações:
- [ ] Permissão de notificações
- [ ] Notificações chegam
- [ ] Deep link funciona (clicar em notificação)

### UI/UX:
- [ ] App funciona em iPhone 12/13/14/15 (diferentes tamanhos)
- [ ] Funciona com Dynamic Island
- [ ] Funciona em modo claro
- [ ] Funciona em modo escuro (se implementado)
- [ ] Keyboard não cobre inputs
- [ ] Safe area respeitada (notch/island)
- [ ] Rotação de tela (se suportado)

### Performance:
- [ ] App abre em <3 segundos
- [ ] Scroll é suave (60 FPS)
- [ ] Transições são fluidas
- [ ] Sem crashes ou travamentos

### Offline:
- [ ] Comportamento sem internet
- [ ] Mensagens de erro claras

---

## 🚀 Próximos Passos: Publicar na App Store

Após testar no iPhone e corrigir bugs:

### 1. **Criar Apple Developer Account** ($99/ano)
- https://developer.apple.com/programs/enroll/

### 2. **Configurar App no App Store Connect**
- Nome do app
- Descrição
- Screenshots
- Ícones
- Categorias
- Idade mínima
- etc.

### 3. **Build para Produção**
```bash
# Incrementar versão
# Em Xcode: Target → General → Version e Build

# Archive
# Xcode → Product → Archive

# Upload para App Store
# Window → Organizer → Upload to App Store
```

### 4. **TestFlight (Opcional mas Recomendado)**
- Beta testing com usuários reais
- Feedback antes do lançamento oficial

### 5. **Submit para Review**
- Apple revisa (1-3 dias)
- Pode pedir mudanças
- Após aprovação, você escolhe quando publicar

---

## 📞 Suporte

Se tiver problemas:

1. **Erros de build:** Verifique logs no Xcode
2. **Erros de signing:** Verifique Apple ID e certificados
3. **App não instala:** Verifique Developer Mode (iOS 16+)
4. **App crashes:** Verifique logs no Xcode Console

---

## 🎯 TL;DR (Resumo Rápido)

```bash
# 1. Instalar Xcode (App Store)
# 2. Instalar CocoaPods
sudo gem install cocoapods

# 3. Build e sync
npm run build
npx cap sync ios

# 4. Instalar pods
cd ios/App && pod install && cd ../..

# 5. Abrir no Xcode
npx cap open ios

# 6. No Xcode:
#    - Selecione seu iPhone no topo
#    - Configure Signing (adicione Apple ID)
#    - Clique em Play (▶️)

# 7. No iPhone:
#    - Confiar neste computador
#    - Confiar no desenvolvedor (Ajustes)
#    - Abrir app!
```

---

**Boa sorte! 🚀**

Se encontrar algum problema, me avise e eu te ajudo!
