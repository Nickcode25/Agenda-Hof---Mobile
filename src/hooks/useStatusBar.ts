/**
 * Hook para controlar o estilo da status bar
 * NOTA: Desabilitado temporariamente para resolver crash no simulador iOS
 * O estilo da status bar é controlado pelo iOS baseado na cor do fundo do app
 * @param _style - não utilizado no momento
 */
export function useStatusBar(_style: 'light' | 'dark') {
  // Desabilitado - o iOS controla automaticamente baseado no conteúdo
  // O crash no simulador era causado pelas chamadas ao plugin StatusBar
}

/**
 * Define o estilo da status bar de forma imperativa
 * NOTA: Desabilitado temporariamente
 */
export async function setStatusBarStyle(_style: 'light' | 'dark') {
  // Desabilitado - ver comentário acima
}
