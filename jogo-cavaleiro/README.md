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

## Evolução do personagem (regras no estilo do RPG clássico)

- **Começo da partida:** todos os atributos em 1 e **48 pontos** para distribuir (abre a janela de Status).
- **Pontos por nível:** ⌊(nível − 1) / 5⌋ + 3. Subir um atributo custa ⌊(valor − 1) / 10⌋ + 2 pontos (máximo 99).
- **Ao subir de nível** abre a janela **Equipamento + Status**, com os botões **+1** e **+5** em cada atributo. A pausa abre a mesma janela.
- **Atq de status** (dano físico): FOR + ⌊FOR/10⌋² + ⌊DES/5⌋ + ⌊SOR/5⌋ (para arqueiros a DES ocupa o lugar da FOR). **Matq:** de INT + ⌊INT/7⌋² até INT + ⌊INT/5⌋². No dano, Atq ou Matq ÷ 40 vira bônus (Atq 40 = +100%).
- **HIT** = nível + DES + SOR/3 e **Flee** = nível + AGI + SOR/5. Golpes físicos acertam com 85% + HIT − Flee do monstro (entre 5% e 95%); se errar, aparece "Miss". Magia e crítico nunca erram. Cada monstro tem nível, que sobe com o tempo e com o seu nível.
- **Esquiva:** contra golpes comuns, usa o seu Flee contra o HIT do monstro. Os ataques avisados dos chefes só podem ser evitados pela **esquiva perfeita** (0,1% por SOR), ou seja, desviando de verdade.
- **HP** = (HP base + 7 por nível) × (1 + VIT/100). **DEF dura** (equipamento e classe) reduz em %; **DEF macia** (VIT/2) subtrai.
- **Crítico** = 1% + SOR × 0,3%: nunca erra e causa ×1,5.
- **Confirmação:** os pontos de status ficam pendentes (valor em azul, botão **−** para tirar) até tocar em **Confirmar**; **Desfazer** devolve tudo. Não dá para voltar ao jogo com pontos pendentes. A escolha de classe também precisa ser marcada e depois confirmada.
- **Aprendiz:** o Golpe de Espada sobe sozinho a cada 2 níveis de classe.

## Árvores de habilidades (`src/data/skilltree.ts`)

Todas as classes (menos o Aprendiz) usam árvore. Regras de build:

- **1 ponto por nível de classe** (cada nível de base também vale meio nível de classe).
- **Teto de pontos:** 12 na 1ª classe e 18 na 2ª (30 no total). Maximizar 8 habilidades custaria 40, então não dá para pegar tudo.
- **Limite:** no máximo **4 habilidades ativas** e **4 passivas** aprendidas.
- Os pontos ficam pendentes até **Confirmar**; **Desfazer** cancela. **Esquecer** (com segundo toque para confirmar) remove uma habilidade, libera a vaga e devolve os pontos gastos nela, se nenhuma outra depender dela.
- A 1ª classe dá a habilidade inicial de graça (Escudo Giratório, Bola de Fogo ou Flecha) e o Golpe de Espada do Aprendiz só continua para o Espadachim. A 2ª classe libera a árvore nova e dá 1 ponto na hora.

| Linha | 1ª classe | 2ª classe A | 2ª classe B |
|---|---|---|---|
| Espadachim | Golpe de Espada, Escudo Giratório, Impacto Explosivo · passivas: Perícia com Espada, Vigor Inabalável, Recuperar HP, Fúria | **Cavaleiro** (espada e capa): Investida Heroica, Golpe Devastador, Corte em X, Turbilhão de Lâminas · Contra-Ataque, Esgrima Veloz, Determinação, Perícia de Cavaleiro | **Paladino** (build de VIT: Aura Sagrada, Escudo Bumerangue, Cruz Sagrada e Escudo Giratório causam dano pela VIT e nunca erram): Aura Sagrada, Escudo Bumerangue, Cruz Sagrada · Fé, Cura Divina, Defensor, Baluarte Sagrado (+VIT) |
| Mago | Bola de Fogo, Lança de Gelo, Relâmpago, Parede de Fogo, Rajada Congelante, Tempestade de Raios, Ataque Espiritual · Foco Arcano, Barreira Arcana | **Bruxo:** Corrente de Raios, Nevasca, Fúria dos Céus, Chuva de Meteoros, Pântano · Domínio Elemental | **Professor:** Livros Voadores, Espinhos da Terra · Dracologia, Lembrança Arcana, Vulcão, Dilúvio, Conjuração Livre, Vendaval |
| Arqueiro | Flecha, Disparo Duplo, Chuva de Flechas · Olhos de Coruja, Olhos de Águia, Concentração | **Caçador de Sombras:** Saraivada das Sombras, Armadilha Explosiva, Ataque do Falcão · Flechas Envenenadas, Caça às Feras, Passo Sombrio | **Atirador de Elite:** Tiro Perfurante, Flecha Explosiva · Mira Certeira, Tiro Fatal, Respiração Calma, Pés Ligeiros |

Todas as habilidades vão até o nível 5. Ativas corpo a corpo usam FOR, à distância usam DES e magias usam INT.

## Itens, conjuntos e coleção (`src/data/equipment.ts`)

- **80 equipamentos** em 5 tiers: comuns da loja, **lendários** (2.200–3.200 z), **épicos** (4.500–8.000 z, o tier mais alto da loja), **raros** (só caem de monstros; a SOR aumenta a chance; repetido vira 250 zeny) e **armas míticas** (3% dos chefes, a chance multiplica a cada volta; equipada, o herói brilha; repetida vira 1.500 zeny).
- Cada chefe e mini-chefe solta 3 raros próprios; o Cavaleiro Negro solta o Elmo Negro e a Lâmina Negra; cada monstro comum tem um raro.
- **Conjuntos** (9): Andarilho, Caçador, Sábio, Guardião de Ferro, Pacto Demoníaco, Realeza, Celestial (épicos), Seda Rubra (Rainha Magmática) e Guardião do Labirinto (Minotauro).
- **Coleção** (aba na loja): bônus permanentes ao juntar 10, 20, 30, 40, 55, 70 e todos os itens, mesmo sem equipar.

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

## Monstros comuns

Gosma, Esqueleto, **Lobo Cinzento** (a partir de 1:30, rápido e ágil; as hordas viram matilhas até os orcs chegarem) e **Ent Ancião** (a partir de 3:20, lento e resistente) usam arte desenhada (`sprites/en-*.png`, 8 quadros). Morcego, Cogumelo, Fantasma e Orc ainda usam a arte feita por código. Lobos e Ents aparecem mais nos Campos Verdes; cada um tem carta e um item raro (Capa de Pele de Lobo, Coroa de Folhas).

## Calendário de chefes

**Mini-chefe** a cada **10 níveis**, alternando **Carniçal** (10, 30, 50...) e **Rainha Magmática** (20, 40, 60...); **chefe** a cada **15 níveis**: **15** Bafome, **30** Minotauro, **45** Lorde Ossário, e o rodízio recomeça (cada volta do mesmo chefe vem muito mais forte).

**Rainha Magmática** (`src/aranha.ts`): aranha de lava com Cuspe de Fogo, Pisada de Magma (deixa poça que queima), Teia (prende e deixa lento), Jato Ácido (envenena), Salto (marca o chão e cai em cima) e **Chuva de Magma** (bolas de magma caem nas marcas e deixam chamas no chão); fúria com metade da vida, quando chama a **Ninhada** (4 filhotes rápidos). Solta Presa de Magma, Capa de Seda Rubra e a carta dela.

**Avisos dos ataques:** todo golpe de chefe marca o chão antes de cair. O contorno mostra a área (círculo, faixa ou leque) e o preenchimento cresce até a borda: **quando enche, o golpe cai** (pisca mais rápido perto do impacto). A barra de vida do chefe tem uma marca nos 50%: abaixo dela ele entra em **FÚRIA**. Ao derrotar um chefe ou mini-chefe, todas as gemas do mapa vêm até o jogador.

**Durante a luta contra um chefe**: ao surgir, ele espanta 70% dos monstros comuns (menos os colados no jogador); enquanto estiver vivo vêm cerca de um terço dos monstros (no máximo 35% do limite na tela) e nenhuma horda, mas cada monstro tem vida ×2 e dano ×1,5.

**Lorde Ossário** (`src/lich.ts`), o chefe mais forte (15.000 de vida, só a partir do nível 45): Esfera da Alma (esferas verdes que perseguem), Ceifa Sombria (golpe giratório de perto), Explosão Profana (ondas de choque que se espalham), Passo Fantasma + Raio Necrótico (some, reaparece perto e dispara um raio em linha) e **Prisão de Ossos** (um círculo de ossos sobe em volta do jogador com uma brecha e o centro explode: saia pela brecha antes do centro encher). Com metade da vida: fúria, invoca fantasmas e esqueletos e faz cair uma Chuva de Caveiras. Solta a Coroa Ossária, o Manto das Almas, a carta dele e a arma mítica Foice das Almas (brilho verde).

## Inimigos e chefes
Gosma, Morcego, Cogumelo Andante, Esqueleto, Fantasma, Orc e Cavaleiro Negro (elite) aparecem conforme o tempo passa. A cada minuto vem uma horda.

**Progressão de força:** a cada minuto ("Ameaça" no HUD), os monstros ganham +45% de vida, +20% de dano e +5% de velocidade. **A partir do nível 8 do jogador, os monstros comuns ficam bem mais fortes a cada nível:** +30% de vida, +12% de dano e +2% de velocidade por nível. Depois dos 4:00 eles também vêm em maior número. Chefes e mini-chefes crescem na metade do ritmo do tempo. Itens de cura são raros.

**Chefes por nível:** a cada 4 níveis, alternando mini-chefe e chefe: nível 4 Carniçal, 8 Bafome, 12 Carniçal, 16 Minotauro, 20 Carniçal, 24 Bafome... **Da 2ª vez em diante, o mesmo chefe volta muito mais forte:** 2,5x a vida, +60% de dano, ataques 30% mais seguidos e já em fúria, para testar a esquiva. Se um chefe ainda estiver vivo, o próximo espera.

**Loja na partida:** a cada 10 níveis a loja abre depois da janela de Status. O zeny da partida vai para a conta e o que você comprar vale na hora.

**Bafome** (sprite próprio, IA em `src/boss.ts`). Ataques, sempre com aviso antes:
- **Golpe Crescente:** de perto, um círculo roxo avisa e logo depois vem o golpe de foice em volta dele.
- **Rugido Demoníaco:** 3 esferas sombrias voam na direção do jogador.
- **Gêiser das Trevas:** marcas no chão (uma embaixo do jogador) e, logo depois, sobem espinhos que amaldiçoam (deixam mais lento).
- **Investida das Sombras:** uma faixa no chão avisa, e ele atravessa a tela em alta velocidade.
- **Espiral Infernal:** gira no lugar soltando braços de esferas em espiral (2 braços; 3 na fúria): passe entre eles.
- **Fúria (com metade da vida):** fica vermelho e mais rápido, ataca com mais frequência, as esferas passam a perseguir o jogador e ele invoca servos (5 esqueletos e um Cavaleiro Negro) a cada 14 segundos.

**Carniçal** (mini-chefe zumbi, sprite próprio, IA em `src/miniboss.ts`):
- **Garras Pútridas:** de perto, ele para, ataca com as garras e envenena.
- **Investida Faminta:** de média distância, dispara na direção do jogador.
- **Vômito Pútrido:** leque de vômito à frente que envenena e deixa uma poça tóxica no chão por 4 s.

Ao ser derrotado, solta gemas, zeny e tem 35% de chance de soltar a Carta Carniçal.

**Minotauro Brutal** (sprite próprio, IA em `src/minotaur.ts`):
- **Golpe Horizontal:** de perto, gira a maça em volta dele.
- **Golpe Vertical:** marca o chão, salta até lá e esmaga (onda de choque e lentidão).
- **Investida de Touro:** uma faixa no chão avisa e ele corre em linha reta.
- **Fenda Sísmica:** soca o chão e abre rachaduras em leque na direção do jogador (3 faixas; 5 na fúria).
- **Fúria (com metade da vida):** fica mais rápido, emenda **três investidas seguidas** (mirando de novo a cada uma) e passa a **bloquear com o escudo**, recebendo 80% menos dano por 2,5 s.

**Números de dano** (fonte própria em `src/assets/dmgfont.webp`): brancos nos golpes normais, laranja na fraqueza, cinza na resistência, vermelhos no dano recebido e verdes na cura. O crítico aparece amarelo, maior, com estrela de impacto e o selo "Crit". A esquiva mostra "Miss".

## Desempenho no celular

- **Atlas de texturas** (`src/atlas.ts`): no carregamento, monstros, cenário, itens e efeitos são copiados para uma folha grande. No celular o Phaser desenha uma textura por vez, então isso derrubou as chamadas de desenho de ~290 para ~36 por quadro.
- **Limite de 60 quadros** em telas de 120 Hz (mesma imagem, metade do trabalho, menos calor e bateria).
- HUD atualizado 5 vezes por segundo (na hora quando o jogador leva dano) e o relógio uma vez por segundo: textos são caros de redesenhar.
- Monstros, hordas e levas entram aos poucos (até 8 por quadro); efeitos e objetos de controle são reaproveitados (sem lixo de memória a cada golpe).

## Jogabilidade

- **Pausa automática** ao sair do app ou trocar de aba: o jogo volta pausado, sem morrer cercado.
- **Joystick flutuante**: passando do limite, a base acompanha o dedo (virar é instantâneo); só o primeiro dedo controla, então um toque em botão não mexe no movimento.
- Metade dos monstros nasce à frente de quem está andando (o caminho não fica vazio).
- Menus em pé (escolha de classe, árvore de habilidades, fim de jogo) ocupam a tela toda, com letras e botões maiores.

## Estrutura

```
src/
  data/        ← balanceamento: classes, habilidades, inimigos, melhorias, atributos
  skills/      ← lógica de cada habilidade (Espada, Escudo, Lança)
  objects/     ← Enemy e Pickup (reutilizados com object pooling)
  scenes/      ← Game (jogo), UI (HUD), LevelUp, Menu/GameOver
  art.ts       ← arte dos personagens, itens e cenário (desenhada por código)
  projectiles.ts ← flechas e bolas de fogo
  fx.ts        ← efeitos visuais reaproveitados e avisos dos ataques dos chefes
  hazards.ts   ← áreas perigosas no chão (poças, chamas, ossos)
  atlas.ts     ← atlas de texturas montado no carregamento
```

- **Nova classe ou linhagem**: adicione em `src/data/classes.ts`. Se ela tiver uma habilidade nova, crie a habilidade em `src/skills/` e registre em `src/skills/index.ts` e `src/data/skills.ts`.
- **Arte de verdade**: carregue as imagens no `BootScene` com as mesmas chaves (`hero-aprendiz`, `en-gosma`, `escudo`...) e remova o desenho correspondente em `textures.ts`.
