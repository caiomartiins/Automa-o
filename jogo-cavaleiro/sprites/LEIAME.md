# Sprites — padrão dos personagens

Folhas de sprites em PNG (fonte para edição). O jogo usa as cópias em WebP de `src/assets/` (sem perda).

## Padrão dos heróis (todos seguem)

Definido com o skill `aas-game-art` (regra de consistência: uma unidade base para todos):

| Item | Padrão |
|---|---|
| Quadro | 320 x 256 px (resolução 2x; no jogo aparece com escala 0,36) |
| Altura do personagem | 196 px de cabeça (ou chapéu) aos pés, em todos os quadros parados e andando |
| Linha dos pés | y = 244 em todos os quadros |
| Direção | virado para a DIREITA |
| Contorno | 2 px na cor #16101c em volta de tudo |
| Sombra | não desenhada no sprite (o jogo coloca a sombra oval no chão) |
| Animações, nesta ordem | parado 2 • andando 4 • ataque 1 a 3 • ferido 1 • morte 2 |

Para padronizar uma folha nova (recorta, escala, alinha os pés, põe contorno e completa as animações),
use o script `padronizar.py` (ver histórico do projeto) e registre o herói em `src/sprites.ts` com
`hero('hero-nome', url, 2, 4, <ataques>, 2, true, 2)`.

## Prompt-base para gerar um herói novo

"Folha de sprites de personagem chibi para jogo 2D de ação vista de cima, pixel art em alta resolução com contorno escuro,
fundo BRANCO puro, personagem virado para a DIREITA, mesmo tamanho em todos os quadros, linhas: parado 2, andando 4 (de lado),
atacando 3, ferido 1, morte 2 (de joelhos, deitado), 4096 px de largura, cabeça nunca cortada."
