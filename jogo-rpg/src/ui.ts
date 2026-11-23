import { CLASSES, FIRST_CLASSES, JOB_CHANGE_LEVEL, type ClassId } from './data/classes';
import { bonusText, item, SHOP_STOCK, STAT_LABEL, type ItemDef } from './data/items';
import { ACTIVE_BY_CLASS, COND_LABEL, CONDS_FOR, skill, SKILLS, type AutoCond } from './data/skills';
import { baseNeed, cannotLearn, HOTBAR_ITEMS, HOTBAR_SIZE, jobNeed, MAX_BASE, STAT_KEYS, statCost, type EquipSlot, type StatKey } from './game/char';
import { ELEMENT_NAME } from './game/combat';
import { itemIcon, skillIcon } from './icons';
import type { GameScene } from './scene';

type Win = 'status' | 'itens' | 'habilidades' | 'loja' | 'dialogo' | 'menu' | 'auto';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const fmt = (n: number) => Math.floor(n).toLocaleString('pt-BR');
const icon = (it: ItemDef) => itemIcon(it.id, it.icon, it.color);
const SLOT_NAME: Record<EquipSlot, string> = { arma: 'Arma', armadura: 'Armadura', acessorio: 'Acessório' };

export class UI {
  hud = document.getElementById('hud')!;
  s!: GameScene;
  win: Win | null = null;
  invTab: 'consumo' | 'equip' | 'etc' = 'consumo';
  autoTab: 'auto' | 'barra' = 'auto';
  shopTab: 'comprar' | 'vender' = 'comprar';
  selItem: string | null = null;
  dlg: { name: string; html: string } | null = null;
  pendingLogs: [string, string][] = [];
  miniBase?: HTMLCanvasElement;
  miniT = 0;
  bannerTimer = 0;
  private r: Record<string, HTMLElement> = {};

  attach(scene: GameScene) {
    this.s = scene;
    this.build();
    this.hud.hidden = false;
    this.mapChanged();
    for (const [m, c] of this.pendingLogs) this.log(m, c);
    this.pendingLogs = [];
    this.log(`Bem-vindo, ${scene.char.name}! Clique no chão para andar e nos monstros para atacar.`, 'sys');
  }

  private q<T extends HTMLElement = HTMLElement>(sel: string) {
    return this.hud.querySelector(sel) as T;
  }

  private build() {
    this.hud.innerHTML = `
      <div class="basic panel">
        <div class="tbar">Informações básicas</div>
        <div class="body">
          <div class="who"><span data-r="name"></span><span data-r="cls"></span></div>
          <div class="bar hp" data-r="hpbar"><span>HP</span><div class="track"><div class="fill" data-r="hp"></div><div class="txt" data-r="hpt"></div></div></div>
          <div class="bar sp"><span>SP</span><div class="track"><div class="fill" data-r="sp"></div><div class="txt" data-r="spt"></div></div></div>
          <div class="bar exp"><span data-r="blv">Nv</span><div class="track"><div class="fill" data-r="exp"></div><div class="txt" data-r="expt"></div></div></div>
          <div class="bar job"><span data-r="jlv">Cl</span><div class="track"><div class="fill" data-r="job"></div><div class="txt" data-r="jobt"></div></div></div>
          <div class="zeny"><span>Zeny</span><b data-r="zeny"></b></div>
          <div class="menu">
            <button data-a="win:status" title="Status (C)">Status<span class="dot" data-r="dotS" hidden></span></button>
            <button data-a="win:itens" title="Itens (I)">Itens</button>
            <button data-a="win:habilidades" title="Habilidades (K)">Habil.<span class="dot" data-r="dotK" hidden></span></button>
            <button data-a="sit" title="Sentar (X)" data-r="sitbtn">Sentar</button>
            <button data-a="win:menu" title="Menu">Menu</button>
          </div>
        </div>
      </div>
      <div class="mini panel"><div class="tbar"><span data-r="mapname"></span><span class="coord" data-r="coord"></span></div><canvas data-r="minimap"></canvas></div>
      <div class="target panel" data-r="target" hidden><div class="nm"><span data-r="tname"></span><small data-r="tinfo"></small></div><div class="track"><div class="fill" data-r="thp"></div></div></div>
      <div class="log" data-r="log"></div>
      <div class="hotbar panel" data-r="hotbar"></div>
      <div class="autobox">
        <button class="autobtn" data-a="auto" data-r="autobtn" title="Caça automática (Z)" aria-pressed="false"><b>AUTO</b><small data-r="autotxt">desligado</small></button>
        <button class="btn small" data-a="win:auto" title="Gerenciador de habilidades (G)">Ajustes</button>
      </div>
      <div data-r="winhost"></div>
      <div class="banner" data-r="banner"></div>
      <div class="mapname" data-r="mapbanner"></div>
      <div class="death" data-r="death" hidden><div class="panel"><b>Você desmaiou…</b><p class="muted">Você perde 1% da experiência do nível e volta ao Acampamento Aurora com metade do HP.</p><button class="btn primary" data-a="respawn">Voltar ao acampamento</button></div></div>
    `;
    this.hud.querySelectorAll<HTMLElement>('[data-r]').forEach((el) => (this.r[el.dataset.r!] = el));
    const hb = this.r.hotbar;
    for (let i = 0; i < 8; i++) {
      const b = document.createElement('button');
      b.className = 'slot';
      b.dataset.a = `hot:${i}`;
      b.innerHTML = `<img alt=""><span class="k">${i + 1}</span><span class="lv"></span><span class="n"></span><span class="cd"></span>`;
      hb.appendChild(b);
    }
    this.hud.addEventListener('click', (e) => this.onClick(e));
    this.hud.addEventListener('change', (e) => this.onChange(e));
    this.hud.addEventListener('dblclick', (e) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('[data-item]');
      if (el && this.win === 'itens') this.s.useItem(el.dataset.item!);
    });
    this.refresh();
  }

  // ================================================================ cliques

  private onClick(e: MouseEvent) {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-a],[data-item]');
    if (!el) return;
    const s = this.s;
    if (el.dataset.item && !el.dataset.a) { this.selItem = el.dataset.item; this.refresh(); return; }
    const [a, arg, arg2] = el.dataset.a!.split(':');
    switch (a) {
      case 'win': this.toggle(arg as Win); break;
      case 'close': this.closeAll(); break;
      case 'sit': s.toggleSit(); break;
      case 'hot': s.useHot(Number(arg)); break;
      case 'stat': s.addStat(arg as StatKey, Number(arg2 ?? 1)); break;
      case 'learn': s.learnSkill(arg); break;
      case 'use': s.useItem(arg); break;
      case 'equip': s.equip(arg); break;
      case 'unequip': s.unequip(arg as EquipSlot); break;
      case 'invtab': this.invTab = arg as UI['invTab']; this.selItem = null; this.refresh(); break;
      case 'shoptab': this.shopTab = arg as UI['shopTab']; this.refresh(); break;
      case 'buy': s.buy(arg, Number(arg2)); break;
      case 'sell': s.sell(arg, arg2 === 'all' ? s.sellable(arg) : Number(arg2)); break;
      case 'respawn': this.r.death.hidden = true; s.respawn(); break;
      case 'save': s.save(); this.log('Jogo salvo neste navegador.', 'sys'); this.closeAll(); break;
      case 'npc': this.npcAction(arg, arg2); break;
      case 'auto': s.toggleAuto(); break;
      case 'autoskill': {
        const e = s.char.auto.skills.find((x) => x.id === arg);
        if (e) e.on = !e.on;
        this.refresh(true);
        break;
      }
      case 'autoup': s.moveAutoSkill(arg, -1); break;
      case 'autodown': s.moveAutoSkill(arg, 1); break;
      case 'autoopt': {
        const cfg = s.char.auto;
        if (arg === 'loot') cfg.loot = !cfg.loot;
        if (arg === 'mvp') cfg.mvp = !cfg.mvp;
        this.refresh(true);
        break;
      }
      case 'autotab': this.autoTab = arg as UI['autoTab']; this.refresh(true); break;
      case 'rate': s.char.expRate = Number(arg); s.save(); this.log(`Taxa de experiência: ${arg}x.`, 'sys'); this.refresh(true); break;
    }
  }

  private onChange(e: Event) {
    const el = e.target as HTMLSelectElement;
    const key = el.dataset.c;
    if (!key) return;
    const s = this.s, cfg = s.char.auto;
    const [a, arg] = key.split(':');
    if (a === 'cond') { const x = cfg.skills.find((k) => k.id === arg); if (x) x.cond = el.value as AutoCond; }
    else if (a === 'hp') cfg.hpPot = Number(el.value);
    else if (a === 'sp') cfg.spPot = Number(el.value);
    else if (a === 'reserve') cfg.spReserve = Number(el.value);
    else if (a === 'hot') s.setHotbar(Number(arg), el.value);
    el.blur();
    this.refresh(true);
  }

  typing() {
    const a = document.activeElement;
    return !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA');
  }

  // ================================================================ janelas

  open(w: Win) {
    this.win = w;
    if (w !== 'itens') this.selItem = null;
    this.refresh();
  }
  toggle(w: Win) {
    if (this.win === w) this.closeAll();
    else this.open(w);
  }
  closeAll() {
    const was = this.win !== null;
    this.win = null;
    this.dlg = null;
    this.refresh();
    return was;
  }
  closeTransient() {
    if (this.win === 'dialogo') this.closeAll();
  }

  private frame(title: string, body: string, wide = false) {
    return `<div class="win panel${wide ? ' wide' : ''}" role="dialog" aria-label="${esc(title)}"><div class="tbar">${esc(title)}<button class="x" data-a="close" aria-label="Fechar">×</button></div><div class="content">${body}</div></div>`;
  }

  refresh(forceWin = false) {
    if (!this.s || !this.r.hotbar) return;
    this.renderHotbar();
    this.tick(true);
    const host = this.r.winhost;
    const ab = this.r.autobtn;
    ab.classList.toggle('on', this.s.auto);
    ab.setAttribute('aria-pressed', String(this.s.auto));
    this.r.autotxt.textContent = this.s.auto ? 'ligado' : 'desligado';
    // não redesenha a janela enquanto uma lista de opções está aberta nela
    const act = document.activeElement;
    if (!forceWin && act && act.tagName === 'SELECT' && host.contains(act)) return;
    const scroll = host.querySelector('.content')?.scrollTop ?? 0;
    let html = '';
    switch (this.win) {
      case 'status': html = this.frame('Status', this.statusHtml(), true); break;
      case 'itens': html = this.frame('Itens e equipamento', this.itemsHtml(), true); break;
      case 'habilidades': html = this.frame('Habilidades', this.skillsHtml(), true); break;
      case 'loja': html = this.frame('Loja da Mercadora Lina', this.shopHtml(), true); break;
      case 'dialogo': html = this.dlg ? this.frame(this.dlg.name, `<div class="dialog">${this.dlg.html}</div>`) : ''; break;
      case 'menu': html = this.frame('Menu', this.menuHtml()); break;
      case 'auto': html = this.frame('Gerenciador de habilidades', this.autoHtml(), true); break;
    }
    host.innerHTML = html;
    const content = host.querySelector('.content');
    if (content) content.scrollTop = scroll;
    for (const b of this.hud.querySelectorAll<HTMLElement>('.menu button')) {
      b.classList.toggle('on', b.dataset.a === `win:${this.win}` || (b.dataset.a === 'sit' && this.s.sitting));
    }
    this.r.dotS.hidden = this.s.char.statPoints <= 0;
    this.r.dotS.textContent = String(this.s.char.statPoints);
    const sk = this.s.char.skillPoints;
    this.r.dotK.hidden = sk <= 0 || this.s.char.cls === 'aprendiz';
    this.r.dotK.textContent = String(sk);
  }

  private statusHtml() {
    const { char: c, d } = this.s;
    const rows = STAT_KEYS.map((k) => {
      const cost = statCost(c.stats[k]);
      const can = c.statPoints >= cost && c.stats[k] < 99;
      const b = d.bonusStats[k];
      return `<tr><td>${STAT_LABEL[k]}</td><td class="v">${c.stats[k]}${b ? ` <small>+${b}</small>` : ''}</td>
        <td><button class="btn small" data-a="stat:${k}:1" ${can ? '' : 'disabled'} aria-label="Mais 1 ${STAT_LABEL[k]}">+1</button>
        <button class="btn small" data-a="stat:${k}:5" ${can ? '' : 'disabled'} aria-label="Mais 5 ${STAT_LABEL[k]}">+5</button></td>
        <td class="c">custo ${cost}</td></tr>`;
    }).join('');
    const derived: [string, string][] = [
      ['Atq', `${d.atk}${d.ranged ? ' (arco)' : ''}`], ['Matq', `${d.matkMin} ~ ${d.matkMax}`], ['HIT', `${d.hit}`], ['Flee', `${d.flee}`],
      ['Crítico', `${d.crit.toFixed(1)}%`], ['DEF', `${d.def} + ${d.softDef}`], ['MDEF', `${d.mdef}`], ['ASPD', `${d.aspd} (${d.delay.toFixed(2)} s)`],
      ['HP / SP', `${d.maxHp} / ${d.maxSp}`], ['Regen.', `${d.hpRegen} HP · ${d.spRegen} SP`],
    ];
    const cls = CLASSES[c.cls];
    return `<div class="stats">
      <div><h3>Atributos</h3><table>${rows}</table><div class="pts">Pontos de atributo: ${c.statPoints}</div></div>
      <div><h3>${esc(cls.name)} · Nv ${c.baseLv} / Classe ${c.jobLv}</h3><table>${derived.map(([k, v]) => `<tr><td>${k}</td><td class="v">${v}</td></tr>`).join('')}</table></div>
    </div>
    <p class="muted" style="margin:8px 0 0">FOR: dano corpo a corpo · AGI: velocidade de ataque e esquiva · VIT: vida e defesa · INT: magia e SP · DES: precisão, dano com arco e conjuração · SOR: crítico e itens raros. Atributos sugeridos para ${esc(cls.name)}: ${cls.main}.</p>`;
  }

  private itemsHtml() {
    const c = this.s.char;
    const slots = (['arma', 'armadura', 'acessorio'] as EquipSlot[]).map((slot) => {
      const id = c.equip[slot];
      const it = id ? item(id) : null;
      return `<div class="eqslot" ${id ? `data-item="${id}"` : ''}>${it ? `<img src="${icon(it)}" alt="">` : '<span style="width:30px"></span>'}<div><span class="muted">${SLOT_NAME[slot]}</span><b>${it ? esc(it.name) : '—'}</b></div></div>`;
    }).join('');
    const group = (t: ItemDef['type']) => (this.invTab === 'consumo' ? t === 'consumo' : this.invTab === 'etc' ? t === 'etc' : t === 'arma' || t === 'armadura' || t === 'acessorio');
    const list = c.inv.filter((e) => group(item(e.id).type));
    const equipped = new Set(Object.values(c.equip));
    const grid = list.length
      ? list.map((e) => { const it = item(e.id); return `<button class="it${this.selItem === e.id ? ' sel' : ''}${equipped.has(e.id) ? ' eq' : ''}" data-item="${e.id}" title="${esc(it.name)}"><img src="${icon(it)}" alt="${esc(it.name)}"><span class="n">${e.n}</span></button>`; }).join('')
      : '<p class="muted">Nada aqui ainda.</p>';
    let detail = '<p class="muted" style="margin:0">Toque num item para ver detalhes. Clique duas vezes para usar ou equipar.</p>';
    if (this.selItem && c.inv.some((e) => e.id === this.selItem)) {
      const it = item(this.selItem);
      const stats: string[] = [];
      if (it.atk) stats.push(`Atq ${it.atk}`);
      if (it.matk) stats.push(`Matq ${it.matk}`);
      if (it.def) stats.push(`DEF ${it.def}`);
      const bt = bonusText(it.bonus);
      if (bt) stats.push(bt);
      if (it.classes && it.classes.length < 4) stats.push(`Classes: ${it.classes.map((k) => CLASSES[k].name).join(', ')}`);
      if (it.reqLv) stats.push(`Nível ${it.reqLv}`);
      const slot = it.type as EquipSlot;
      let btn = '';
      if (it.type === 'consumo') btn = `<button class="btn primary" data-a="use:${it.id}">Usar</button>`;
      else if (it.type !== 'etc') btn = c.equip[slot] === it.id ? `<button class="btn" data-a="unequip:${slot}">Desequipar</button>` : `<button class="btn primary" data-a="equip:${it.id}">Equipar</button>`;
      detail = `<b>${esc(it.name)}</b><p>${esc(it.desc)}${stats.length ? `<br>${stats.join(' · ')}` : ''}<br>Vende por ${fmt(it.sell)} z</p>${btn}`;
    }
    const tab = (k: UI['invTab'], label: string) => `<button class="btn${this.invTab === k ? ' on' : ''}" data-a="invtab:${k}">${label}</button>`;
    return `<div class="equip">${slots}</div>
      <div class="tabs">${tab('consumo', 'Usáveis')}${tab('equip', 'Equipamentos')}${tab('etc', 'Espólios')}<span class="muted" style="margin-left:auto;align-self:center;font-weight:800">${fmt(c.zeny)} z</span></div>
      <div class="grid-inv">${grid}</div><div class="detail">${detail}</div>`;
  }

  private skillsHtml() {
    const c = this.s.char;
    const list = SKILLS.filter((s) => s.cls === c.cls || s.cls === 'aprendiz');
    const rows = list.map((sk) => {
      const lv = c.skills[sk.id] ?? 0;
      const why = cannotLearn(c, sk.id);
      const locked = !!sk.req && (c.skills[sk.req[0]] ?? 0) < sk.req[1];
      const next = Math.min(sk.max, lv + 1);
      const extra = [sk.kind === 'passiva' ? 'Passiva' : `SP ${sk.sp?.(Math.max(1, lv)) ?? 0}`, sk.element ? ELEMENT_NAME[sk.element] : ''].filter(Boolean).join(' · ');
      const reqTxt = sk.req ? ` · Requer ${skill(sk.req[0]).name} ${sk.req[1]}` : '';
      const descLv = lv > 0 && lv < sk.max ? `Agora: ${sk.desc(lv)} Próximo: ${sk.desc(next)}` : sk.desc(Math.max(1, lv));
      return `<div class="skill${locked ? ' locked' : ''}"><img src="${skillIcon(sk.id, sk.glyph, sk.color)}" alt="">
        <div><div class="nm">${esc(sk.name)} <small>Nv ${lv}/${sk.max} · ${extra}${reqTxt}</small></div><p>${esc(descLv)}</p></div>
        <button class="btn small" data-a="learn:${sk.id}" ${why ? 'disabled' : ''} title="${esc(why ?? 'Aprender')}">+</button></div>`;
    }).join('');
    const msg = c.cls === 'aprendiz'
      ? `<p class="muted">Aprendizes guardam os pontos. Ao mudar de classe no nível de classe ${JOB_CHANGE_LEVEL}, você usa todos eles nas habilidades da classe nova.</p>`
      : '<p class="muted">As habilidades ativas ficam na barra de atalhos (teclas 1 a 8).</p>';
    return `<div class="row" style="justify-content:space-between;margin:0 0 4px"><span class="pts" style="margin:0">Pontos de habilidade: ${c.skillPoints}</span><button class="btn small" data-a="win:auto">Gerenciar automático e atalhos</button></div>${msg}${rows}`;
  }

  private shopHtml() {
    const s = this.s, c = s.char;
    const tab = (k: UI['shopTab'], label: string) => `<button class="btn${this.shopTab === k ? ' on' : ''}" data-a="shoptab:${k}">${label}</button>`;
    let lines = '';
    if (this.shopTab === 'comprar') {
      lines = SHOP_STOCK.map((id) => {
        const it = item(id);
        const why = it.type === 'consumo' ? null : (it.classes && !it.classes.includes(c.cls) ? 'outra classe' : null);
        const many = it.type === 'consumo' ? `<button class="btn small" data-a="buy:${id}:10" ${c.zeny < it.price * 10 ? 'disabled' : ''}>x10</button>` : '';
        return `<div class="line"><img src="${icon(it)}" alt=""><div><b>${esc(it.name)}</b><small>${esc(it.desc)}${why ? ` (${why})` : ''}${it.reqLv ? ` · Nv ${it.reqLv}` : ''}</small></div>
          <span class="price">${fmt(it.price)} z</span><span class="row"><button class="btn small" data-a="buy:${id}:1" ${c.zeny < it.price ? 'disabled' : ''}>Comprar</button>${many}</span></div>`;
      }).join('');
    } else {
      const sellable = c.inv.filter((e) => s.sellable(e.id) > 0);
      lines = sellable.length ? sellable.map((e) => {
        const it = item(e.id), n = s.sellable(e.id);
        return `<div class="line"><img src="${icon(it)}" alt=""><div><b>${esc(it.name)} ×${n}</b><small>${fmt(it.sell)} z cada</small></div>
          <span class="price">${fmt(it.sell * n)} z</span><span class="row"><button class="btn small" data-a="sell:${e.id}:1">Vender 1</button>${n > 1 ? `<button class="btn small" data-a="sell:${e.id}:all">Todos</button>` : ''}</span></div>`;
      }).join('') : '<p class="muted">Você não tem nada para vender. Itens equipados não aparecem aqui.</p>';
    }
    return `<div class="tabs">${tab('comprar', 'Comprar')}${tab('vender', 'Vender')}<span class="muted" style="margin-left:auto;align-self:center;font-weight:800">${fmt(c.zeny)} z</span></div><div class="shop">${lines}</div>`;
  }

  private menuHtml() {
    const rate = this.s.char.expRate;
    const rates = [1, 3, 5, 10, 20].map((r) => `<button class="btn${r === rate ? ' on' : ''}" data-a="rate:${r}" aria-pressed="${r === rate}">${r}x</button>`).join('');
    return `<div class="choices">
      <h3 style="margin:0">Taxa de experiência (teste)</h3>
      <div class="tabs rates">${rates}</div>
      <button class="btn primary" data-a="save">Salvar agora</button>
      <p class="muted" style="margin:4px 0 0;line-height:1.5">O jogo também salva sozinho a cada 20 segundos, ao trocar de mapa e ao subir de nível.<br>
      <b>Controles:</b> clique no chão para andar e no monstro para atacar · WASD ou setas também andam · Espaço ataca o monstro mais perto · 1–8 barra de atalhos · Z caça automática · G gerenciador de habilidades · C status · I itens · K habilidades · X sentar · Esc fecha janelas.</p>
    </div>`;
  }

  private autoHtml() {
    const s = this.s, c = s.char, cfg = c.auto;
    const tab = (k: UI['autoTab'], label: string) => `<button class="btn${this.autoTab === k ? ' on' : ''}" data-a="autotab:${k}">${label}</button>`;
    let body = '';
    if (this.autoTab === 'auto') {
      const rows = cfg.skills.map((e, i) => {
        const sk = skill(e.id), lv = c.skills[e.id] ?? 0;
        const conds = CONDS_FOR[sk.auto ?? 'alvo'];
        const sel = conds.length > 1
          ? `<select data-c="cond:${e.id}" aria-label="Quando usar ${esc(sk.name)}">${conds.map((k) => `<option value="${k}"${k === e.cond ? ' selected' : ''}>${COND_LABEL[k]}</option>`).join('')}</select>`
          : `<span class="muted">${COND_LABEL[conds[0]]}</span>`;
        return `<div class="aslot${e.on && lv ? '' : ' off'}">
          <span class="prio">${i + 1}</span><img src="${skillIcon(sk.id, sk.glyph, sk.color)}" alt="">
          <div class="nm"><b>${esc(sk.name)}</b><small>${lv ? `Nv ${lv} · SP ${sk.sp?.(lv) ?? 0}` : 'ainda não aprendida'}</small>${sel}</div>
          <div class="ctl">
            <button class="btn small${e.on ? ' on' : ''}" data-a="autoskill:${e.id}" aria-pressed="${e.on}">${e.on ? 'Usar' : 'Não usar'}</button>
            <span class="row"><button class="btn small" data-a="autoup:${e.id}" ${i === 0 ? 'disabled' : ''} aria-label="Subir prioridade">▲</button><button class="btn small" data-a="autodown:${e.id}" ${i === cfg.skills.length - 1 ? 'disabled' : ''} aria-label="Descer prioridade">▼</button></span>
          </div></div>`;
      }).join('');
      const opt = (key: string, cur: number, vals: [number, string][], label: string) =>
        `<label class="opt"><span>${label}</span><select data-c="${key}">${vals.map(([v, t]) => `<option value="${v}"${v === cur ? ' selected' : ''}>${t}</option>`).join('')}</select></label>`;
      const tog = (key: string, on: boolean, label: string) =>
        `<label class="opt"><span>${label}</span><button class="btn small${on ? ' on' : ''}" data-a="autoopt:${key}" aria-pressed="${on}">${on ? 'Sim' : 'Não'}</button></label>`;
      body = `
        <div class="autohead">
          <button class="btn ${s.auto ? '' : 'primary'}" data-a="auto">${s.auto ? 'Desligar caça automática' : 'Ligar caça automática'}</button>
          <p class="muted">O herói procura o monstro mais perto (primeiro os que estão atacando você), ataca, usa as habilidades abaixo e pega os itens. Andar, clicar no chão ou falar com um NPC desliga. Ele não entra em portais sozinho.</p>
        </div>
        <h3>Habilidades, em ordem de prioridade</h3>
        <div class="alist">${rows}</div>
        <p class="muted" style="margin:6px 0 0">Magias e flechas que o alvo resiste (por exemplo, fogo numa Gosma de água) são puladas.</p>
        <h3>Poções e opções</h3>
        <div class="opts">
          ${opt('hp', cfg.hpPot, [[0, 'Desligado'], [30, 'Abaixo de 30%'], [50, 'Abaixo de 50%'], [70, 'Abaixo de 70%']], 'Poção de HP')}
          ${opt('sp', cfg.spPot, [[0, 'Desligado'], [20, 'Abaixo de 20%'], [40, 'Abaixo de 40%']], 'Poção Azul (SP)')}
          ${opt('reserve', cfg.spReserve, [[0, 'Nada'], [20, '20% do SP'], [40, '40% do SP']], 'Guardar SP para curas')}
          ${tog('loot', cfg.loot, 'Pegar itens do chão')}
          ${tog('mvp', cfg.mvp, 'Atacar MVP (Bafome)')}
        </div>`;
    } else {
      const options = [
        ['', '(vazio)'],
        ...ACTIVE_BY_CLASS[c.cls].map((id) => [`skill:${id}`, `Habilidade: ${skill(id).name}`]),
        ...HOTBAR_ITEMS.map((id) => [`item:${id}`, `Item: ${item(id).name}`]),
      ];
      const rows = Array.from({ length: HOTBAR_SIZE }, (_, i) => {
        const cur = c.hotbar[i] ?? '';
        return `<label class="opt"><span><b>Tecla ${i + 1}</b></span><select data-c="hot:${i}">${options.map(([v, t]) => `<option value="${v}"${v === cur ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`;
      }).join('');
      body = `<p class="muted" style="margin:0 0 6px">Escolha o que fica em cada tecla da barra de atalhos. Ao mudar de classe, a barra volta ao padrão da classe nova.</p><div class="opts">${rows}</div>`;
    }
    return `<div class="tabs">${tab('auto', 'Caça automática')}${tab('barra', 'Barra de atalhos')}</div>${body}`;
  }

  // ================================================================ NPCs

  talk(id: string, name: string) {
    const c = this.s.char;
    if (id === 'instrutor') {
      let html = `<p><span class="npc">${esc(name)}:</span> `;
      if (c.cls === 'aprendiz' && c.jobLv >= JOB_CHANGE_LEVEL) html += 'Você treinou bem, aprendiz. Está na hora de escolher o seu caminho.</p>';
      else if (c.cls === 'aprendiz') html += `Bem-vindo ao Acampamento Aurora! Treine nas Gosmas aqui perto. Volte quando chegar ao nível de classe ${JOB_CHANGE_LEVEL} (agora: ${c.jobLv}) e eu te ensino uma profissão.</p>`;
      else html += `Que orgulho ver você como ${esc(CLASSES[c.cls].name)}! Dizem que o Bafome acordou no fundo do Bosque Antigo…</p>`;
      html += '<div class="choices">';
      if (c.cls === 'aprendiz' && c.jobLv >= JOB_CHANGE_LEVEL) html += '<button class="btn primary" data-a="npc:classe">Quero mudar de classe</button>';
      html += '<button class="btn" data-a="npc:descansar">Descansar (recupera HP e SP e salva)</button>';
      html += '<button class="btn" data-a="npc:dicas">Dicas para começar</button>';
      html += '<button class="btn" data-a="close">Até logo</button></div>';
      this.dlg = { name, html };
    } else {
      this.dlg = {
        name,
        html: `<p><span class="npc">${esc(name)}:</span> Poções fresquinhas, armas e armaduras! E compro tudo o que você trouxer dos monstros.</p>
          <div class="choices"><button class="btn primary" data-a="npc:comprar">Comprar</button><button class="btn" data-a="npc:vender">Vender</button><button class="btn" data-a="close">Só olhando</button></div>`,
      };
    }
    this.open('dialogo');
  }

  private npcAction(a: string, arg?: string) {
    const s = this.s;
    if (a === 'comprar' || a === 'vender') { this.shopTab = a; this.open('loja'); return; }
    if (a === 'descansar') {
      s.restAtCamp();
      this.dlg = { name: 'Instrutor Dário', html: '<p><span class="npc">Instrutor Dário:</span> Pronto, descansado e com o progresso salvo. Boa caçada!</p><div class="choices"><button class="btn" data-a="close">Obrigado</button></div>' };
      this.refresh();
      return;
    }
    if (a === 'dicas') {
      this.dlg = {
        name: 'Instrutor Dário',
        html: `<p><span class="npc">Instrutor Dário:</span> Distribua seus pontos em Status (C). As Gosmas são calmas: só atacam se você bater nelas. Os Lobos Cinzentos do leste andam em matilha e atacam sozinhos.</p>
          <p>Sente (X) para recuperar HP e SP mais rápido. Venda os espólios para a Mercadora Lina e compre poções. Quando estiver forte, o portal ao sudeste leva ao Bosque Antigo.</p>
          <div class="choices"><button class="btn" data-a="close">Entendi</button></div>`,
      };
      this.refresh();
      return;
    }
    if (a === 'classe') {
      const opts = FIRST_CLASSES.map((k) => `<button class="btn" data-a="npc:escolher:${k}"><b>${CLASSES[k].name}</b><small>${CLASSES[k].tagline}</small><small>${CLASSES[k].main}</small></button>`).join('');
      this.dlg = { name: 'Instrutor Dário', html: `<p><span class="npc">Instrutor Dário:</span> Escolha com calma: não dá para voltar atrás.</p><div class="classes">${opts}</div>` };
      this.refresh();
      return;
    }
    if (a === 'escolher' && arg) {
      this.dlg = {
        name: 'Instrutor Dário',
        html: `<p><span class="npc">Instrutor Dário:</span> Tem certeza de que quer ser <b>${CLASSES[arg as ClassId].name}</b>?</p>
          <div class="choices"><button class="btn primary" data-a="npc:confirmar:${arg}">Sim, quero ser ${CLASSES[arg as ClassId].name}</button><button class="btn" data-a="npc:classe">Voltar</button></div>`,
      };
      this.refresh();
      return;
    }
    if (a === 'confirmar' && arg) {
      s.changeClass(arg as ClassId);
      this.closeAll();
      this.open('habilidades');
    }
  }

  death() {
    this.closeAll();
    this.r.death.hidden = false;
  }

  // ================================================================ HUD

  private renderHotbar() {
    const s = this.s;
    const slots = s.hotbar();
    const btns = this.r.hotbar.querySelectorAll<HTMLButtonElement>('.slot');
    btns.forEach((b, i) => {
      const h = slots[i];
      const img = b.querySelector('img')!, n = b.querySelector<HTMLElement>('.n')!, lv = b.querySelector<HTMLElement>('.lv')!;
      b.classList.toggle('empty', !h);
      if (!h) { img.removeAttribute('src'); n.textContent = ''; lv.textContent = ''; b.title = 'Vazio (escolha em Ajustes)'; return; }
      if (h.kind === 'skill') {
        const sk = skill(h.id), l = s.char.skills[h.id] ?? 0;
        img.src = skillIcon(sk.id, sk.glyph, sk.color);
        n.textContent = '';
        lv.textContent = l ? String(l) : '';
        b.classList.toggle('off', !l);
        b.title = `${sk.name}${l ? ` (nível ${l})` : ' (não aprendida)'} · SP ${sk.sp?.(Math.max(1, l)) ?? 0}`;
      } else {
        const it = item(h.id), cnt = s.char.inv.find((e) => e.id === h.id)?.n ?? 0;
        img.src = icon(it);
        n.textContent = String(cnt);
        lv.textContent = '';
        b.classList.toggle('off', cnt === 0);
        b.title = `${it.name} · ${it.desc}`;
      }
    });
  }

  tick(force = false) {
    const s = this.s;
    if (!s || !this.r.hp) return;
    const c = s.char, d = s.d;
    const set = (k: string, v: string) => { if (this.r[k].textContent !== v) this.r[k].textContent = v; };
    set('name', c.name);
    set('cls', CLASSES[c.cls].name);
    const hpk = Math.max(0, c.hp / d.maxHp);
    this.r.hp.style.width = `${hpk * 100}%`;
    this.r.hpbar.classList.toggle('low', hpk < 0.25);
    set('hpt', `${Math.max(0, Math.floor(c.hp))} / ${d.maxHp}`);
    this.r.sp.style.width = `${(c.sp / d.maxSp) * 100}%`;
    set('spt', `${Math.floor(c.sp)} / ${d.maxSp}`);
    const ek = c.baseLv >= MAX_BASE ? 1 : c.baseExp / baseNeed(c.baseLv);
    this.r.exp.style.width = `${ek * 100}%`;
    set('blv', `Nv ${c.baseLv}`);
    set('expt', `${(ek * 100).toFixed(1)}%`);
    const maxJob = CLASSES[c.cls].maxJob;
    const jk = c.jobLv >= maxJob ? 1 : c.jobExp / jobNeed(c.cls, c.jobLv);
    this.r.job.style.width = `${jk * 100}%`;
    set('jlv', `Cl ${c.jobLv}`);
    set('jobt', `${(jk * 100).toFixed(1)}%`);
    set('zeny', `${fmt(c.zeny)} z`);

    // recarga e SP na barra de atalhos
    const slots = s.hotbar();
    this.r.hotbar.querySelectorAll<HTMLElement>('.slot').forEach((b, i) => {
      const h = slots[i];
      if (!h) return;
      const cd = b.querySelector<HTMLElement>('.cd')!;
      if (h.kind === 'skill') {
        const sk = skill(h.id), l = c.skills[h.id] ?? 0;
        const total = sk.cd?.(Math.max(1, l)) ?? 0.3;
        const left = s.cooldownLeft(h.id);
        cd.style.setProperty('--p', `${left > 0 ? (left / total) * 100 : 0}%`);
        b.classList.toggle('nosp', l > 0 && c.sp < (sk.sp?.(l) ?? 0));
      }
    });

    // alvo
    const t = s.target && !s.target.dead ? s.target : null;
    this.r.target.hidden = !t;
    if (t) {
      set('tname', t.def.name);
      set('tinfo', `Nv ${t.def.lv} · ${ELEMENT_NAME[t.def.element]} · ${t.def.race}`);
      this.r.target.classList.toggle('mvp', !!t.def.boss);
      this.r.thp.style.width = `${Math.max(0, t.hp / t.maxHp) * 100}%`;
    }

    // minimapa (4x por segundo)
    const now = performance.now();
    if (force || now - this.miniT > 250) {
      this.miniT = now;
      this.drawMinimap();
      set('coord', `${Math.floor(s.sprite.x / 64)}, ${Math.floor(s.sprite.y / 64)}`);
    }
  }

  mapChanged() {
    const w = this.s.world;
    const cv = this.r.minimap as HTMLCanvasElement;
    const W = 176 * 2;
    const H = Math.round((W * w.pxH) / w.pxW);
    cv.width = W; cv.height = H;
    const base = document.createElement('canvas');
    base.width = W; base.height = H;
    base.getContext('2d')!.drawImage(w.canvas, 0, 0, W, H);
    this.miniBase = base;
    this.r.mapname.textContent = w.def.name;
    const mb = this.r.mapbanner;
    mb.innerHTML = `${esc(w.def.name)}<br><small style="font-family:var(--ui);font-size:13px">${esc(w.def.subtitle)}</small>`;
    mb.classList.add('show');
    setTimeout(() => mb.classList.remove('show'), 2600);
    this.refresh();
  }

  private drawMinimap() {
    const s = this.s, cv = this.r.minimap as HTMLCanvasElement;
    if (!this.miniBase) return;
    const ctx = cv.getContext('2d')!;
    const k = cv.width / s.world.pxW;
    ctx.drawImage(this.miniBase, 0, 0);
    ctx.fillStyle = 'rgba(10, 20, 40, 0.18)';
    ctx.fillRect(0, 0, cv.width, cv.height);
    const dot = (x: number, y: number, r: number, col: string) => {
      ctx.beginPath(); ctx.arc(x * k, y * k, r, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.stroke();
    };
    for (const p of s.portals) for (const [x, y] of p.pts) dot(x, y, 4, '#6fd0ff');
    for (const n of s.npcs) dot(n.x, n.y, 4, '#ffd36b');
    for (const m of s.monsters) if (!m.dead) dot(m.x, m.y, m.def.boss ? 6 : 2.6, m.def.boss ? '#c77dff' : '#ff5a5a');
    dot(s.sprite.x, s.sprite.y, 4.5, '#ffffff');
  }

  log(msg: string, cls = '') {
    if (!this.r.log) { this.pendingLogs.push([msg, cls]); return; }
    const el = document.createElement('div');
    el.textContent = msg;
    if (cls) el.className = cls;
    this.r.log.appendChild(el);
    while (this.r.log.children.length > 7) this.r.log.firstElementChild!.remove();
  }

  banner(title: string, sub = '') {
    const b = this.r.banner;
    if (!b) return;
    b.innerHTML = `${esc(title)}${sub ? `<small>${esc(sub)}</small>` : ''}`;
    b.classList.add('show');
    clearTimeout(this.bannerTimer);
    this.bannerTimer = window.setTimeout(() => b.classList.remove('show'), 2400);
  }
}
