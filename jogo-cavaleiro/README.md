# Ascensão do Cavaleiro (protótipo)

Jogo de sobrevivência com hordas para o navegador, no estilo "survivors". O herói ataca sozinho e você só controla o movimento. Feito com **Phaser 3 + TypeScript + Vite**.

## Como rodar

```bash
cd jogo-cavaleiro
npm install
npm run dev      # abre em http://localhost:5173
npm run build    # gera a pasta dist/ pronta para publicar (itch.io, GitHub Pages...)
```

## Controles
- **WASD / setas**: andar (no celular, toque e arraste)
- **1 / 2 / 3 ou clique**: escolher a melhoria ao subir de nível
- **P / ESC**: pausar
- **L**: sobe um nível na hora (só no `npm run dev`, para testes)

## Classes

Todos começam como **Aprendiz**. No **nível 5** escolhem a 1ª classe e no **nível 15** escolhem entre dois caminhos de 2ª classe.

| 1ª classe (Nv 5) | 2ª classe (Nv 15): opção A | 2ª classe (Nv 15): opção B |
|---|---|---|
| Espadachim: Escudo Giratório | Cavaleiro: Golpe Devastador | Paladino: Aura Sagrada |
| Mago: Bola de Fogo | Bruxo: Corrente de Raios | Professor: Livros Voadores |
| Arqueiro: Flecha | Atirador de Elite: Tiro Perfurante | Caçador de Sombras: Saraivada das Sombras |

O Golpe de Espada do Aprendiz continua com todos. Cada habilidade vai até o nível 5. Também existem 8 melhorias passivas (Força, Agilidade, Alcance, Vitalidade, Regeneração, Botas, Ímã, Armadura).

## Sprites desenhados à mão
Todos os heróis usam sprites recortados das imagens enviadas. A fonte em PNG fica em `sprites/` e o jogo usa as versões WebP de `src/assets/`, registradas em `src/sprites.ts`. Os monstros ainda usam a arte gerada em `src/art.ts`.

## Evolução do personagem

- **Ao subir de nível** abre a janela **Equipamento + Status**: slots de equipamento dos dois lados, o personagem no meio e os atributos com o botão ▶. A pausa abre a mesma janela.
- **Pontos de status:** cada nível dá `nível/5 + 4` pontos. Subir um atributo custa 2 pontos, e o custo aumenta 1 a cada 10 pontos no atributo.
- **O dano vem dos atributos e do equipamento:** FOR, DES e INT dão +3% de dano corpo a corpo, à distância e mágico por ponto. Não há mais escolha de bônus ao subir de nível.
- **Habilidades** sobem sozinhas: a cada 2 níveis de classe, a de menor nível sobe.
- **Equipamentos** (`src/data/equipment.ts`): são comprados com zeny na loja (cabeça, corpo, arma, mão esquerda, capa, calçado e 2 acessórios), ficam salvos e valem em todas as partidas. O Ferreiro refina a arma equipada, e cada arma guarda o próprio refino.

## Sistemas de RPG (`src/data/rpg.ts`)

  - FOR, DES e INT aumentam o dano corpo a corpo, à distância e mágico.
  - AGI aumenta a velocidade de ataque e a esquiva.
  - VIT aumenta a vida, a regeneração e a resistência a estados.
  - SOR aumenta o crítico e a chance de itens.
- **Elementos:** Neutro, Fogo, Água, Terra, Vento, Sagrado, Sombrio, Fantasma e Morto-vivo, com tabela de fraquezas. Os números de dano ficam laranja na fraqueza, cinza na resistência e dourados no crítico.
- **Raças e tamanhos:** cada monstro tem os seus. Algumas habilidades e cartas dão bônus por raça ou tamanho.
- **Estados alterados:**
  - Nos monstros: queimando, envenenado (mais lento), sangrando, atordoado e congelado.
  - No jogador: maldição do Bafome (mais lento) e veneno do cogumelo.
- **Cartas de monstro:** cada monstro tem uma carta rara, e os chefes sempre soltam a deles. A Carta Bafome deixa o Golpe de Espada em 360°.
- **Itens:** poções (vermelha, laranja e branca), Asa de Teletransporte (tecla Q ou botão), Pena da Ressurreição e zeny.
- **Nível de classe:** sobe derrotando monstros, recomeça a cada promoção e dá +2% de dano por nível.
- **Mascotes:** ovos caem dos monstros ou são comprados na loja. Gosminha, Morceguinho (ataca), Fantasminha e Cogumelinho.
- **Mapas:** Campos Verdes, Deserto Escaldante, Caverna Sombria e Ruínas Esquecidas, escolhidos no menu. Cada um tem seu chão, decoração e monstros mais comuns.
- **Loja de Equipamentos e Ferreiro** (entre partidas, com o zeny guardado no navegador): refino da arma de +1 a +10. A partir do +5 o refino pode falhar e a arma volta a +0.
- **Janela de status:** aparece ao pausar e mostra atributos, cartas, habilidades, equipamento e mascote.

## Inimigos e chefes
Gosma, Morcego, Cogumelo Andante, Esqueleto, Fantasma, Orc e Cavaleiro Negro (elite) aparecem conforme o tempo passa. A cada minuto vem uma horda.

**Progressão de força:** a cada minuto ("Ameaça" no HUD), os monstros ganham +45% de vida, +20% de dano e +5% de velocidade (a velocidade sobe até +50%). Os chefes crescem na metade desse ritmo. Itens de cura são raros.

**Bafome** (sprite próprio, IA em `src/boss.ts`) aparece quando o jogador chega ao **nível 10**. Ataques, sempre com aviso antes:
- **Golpe Crescente:** de perto, um círculo roxo avisa e logo depois vem o golpe de foice em volta dele.
- **Rugido Demoníaco:** 3 esferas sombrias voam na direção do jogador.
- **Gêiser das Trevas:** marcas no chão (uma embaixo do jogador) e, logo depois, sobem espinhos que amaldiçoam (deixam mais lento).
- **Investida das Sombras:** uma faixa no chão avisa, e ele atravessa a tela em alta velocidade.
- **Fúria (com metade da vida):** fica vermelho e mais rápido, ataca com mais frequência, as esferas passam a perseguir o jogador e ele invoca servos (5 esqueletos e um Cavaleiro Negro) a cada 14 segundos.

**Carniçal** (mini-chefe zumbi, sprite próprio, IA em `src/miniboss.ts`) aparece aos 2 minutos e depois a cada 3min30s, mais forte a cada vez:
- **Garras Pútridas:** de perto, ele para, ataca com as garras e envenena.
- **Investida Faminta:** de média distância, dispara na direção do jogador.

Ao ser derrotado, solta gemas, zeny e tem 35% de chance de soltar a Carta Carniçal.

Além dele, a cada 5 minutos aparece um chefe de tempo (Rei Gosma, depois Lorde Esqueleto...).

## Estrutura

```
src/
  data/        ← balanceamento: classes, habilidades, inimigos, melhorias, atributos
  skills/      ← lógica de cada habilidade (Espada, Escudo, Lança)
  objects/     ← Enemy e Pickup (reutilizados com object pooling)
  scenes/      ← Game (jogo), UI (HUD), LevelUp, Menu/GameOver
  art.ts       ← arte dos personagens, itens e cenário (desenhada por código)
  projectiles.ts ← flechas e bolas de fogo
  fx.ts        ← efeitos visuais reaproveitados
```

- **Nova classe ou linhagem**: adicione em `src/data/classes.ts`. Se ela tiver uma habilidade nova, crie a habilidade em `src/skills/` e registre em `src/skills/index.ts` e `src/data/skills.ts`.
- **Arte de verdade**: carregue as imagens no `BootScene` com as mesmas chaves (`hero-aprendiz`, `en-gosma`, `escudo`...) e remova o desenho correspondente em `textures.ts`.
