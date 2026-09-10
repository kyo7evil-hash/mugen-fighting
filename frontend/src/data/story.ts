import { getCharacter } from '@mugen/shared';

export type Beat =
  | { t: 'title'; text: string }
  | { t: 'line'; who: string; text: string }
  | { t: 'fight'; opp: string; title: string };

interface Arc {
  intro: string;
  rivals: [string, string, string];
  boss: string;
  mid: string[]; // one line said by the hero after fights 1..3
  outro: string;
}

const ARCS: Record<string, Arc> = {
  kaito: {
    intro: 'A tournament with no prize but the fight itself. Good. I have nothing else to carry.',
    rivals: ['rieko', 'sable', 'grigor'],
    boss: 'goliath',
    mid: ['Fast. But speed alone is a straight line.', 'You waited for my mistake. I stopped making it.', 'Patience against patience. One of us had to move.'],
    outro: 'No trophy. No banner. Just the walk home, lighter than before.',
  },
  bruno: {
    intro: 'They say the giant at the top cannot be moved. I move logs for a living.',
    rivals: ['anira', 'vesper', 'tomas'],
    boss: 'goliath',
    mid: ['Come down here. That is where the fight is.', 'Range is just distance I have to close. I closed it.', 'Two schools, one grip. Both let go.'],
    outro: 'The giant is set down gently. Bruno is, if nothing else, careful with his loads.',
  },
  vesper: {
    intro: 'I have never lost a fight I started at range. Ten of them will not change that.',
    rivals: ['rieko', 'bruno', 'nadia'],
    boss: 'goliath',
    mid: ['You crossed the whole stage. It still was not enough.', 'Armour buys steps. Steps run out.', 'Your shadow moved. I aimed at the space it left.'],
    outro: 'From the ridge the arena is small, and every line across it was already hers.',
  },
  rieko: {
    intro: 'Ten fights, one straight road. I only know how to go forward.',
    rivals: ['kaito', 'grigor', 'sable'],
    boss: 'goliath',
    mid: ['Discipline is slower than I am.', 'You charged. I was already past you.', 'You wanted me to whiff. I never stopped long enough.'],
    outro: 'She crosses the last line first, engine ticking, already scanning for the next race.',
  },
  grigor: {
    intro: 'I have waited in worse rooms than this one. I can wait here.',
    rivals: ['anira', 'rieko', 'tomas'],
    boss: 'goliath',
    mid: ['You flew. Gravity and I are patient.', 'Fast twice, then tired. I only needed once.', 'Stone stance, meet stone fist.'],
    outro: 'The wait is over. Nine ports, and now a tenth trophy he never reached for.',
  },
  anira: {
    intro: 'Everyone down here keeps looking at the ground. I will be up here.',
    rivals: ['bruno', 'grigor', 'sable'],
    boss: 'goliath',
    mid: ['Big and slow is just a bigger target.', 'Your charge needs a floor. I took the floor away.', 'You countered where I was. I was not there.'],
    outro: 'Anira lands on the highest tile without a sound, and looks up, not down.',
  },
  tomas: {
    intro: 'Two schools said I had to choose. This tournament will hear my answer.',
    rivals: ['kaito', 'vesper', 'rieko'],
    boss: 'goliath',
    mid: ['Balance against balance. I simply had two.', 'You kept me out. So I became the wall instead.', 'You could not outrun a stance you could not read.'],
    outro: 'Water and stone, at last, agree — and both of them won.',
  },
  nadia: {
    intro: 'We enter as two. The tournament will have to beat both of us.',
    rivals: ['vesper', 'anira', 'grigor'],
    boss: 'goliath',
    mid: ['You aimed at one of us.', 'You chased me. She was behind you.', 'Armour for one target. There were two.'],
    outro: 'Two shadows leave where one arrived. The debt is paid, for another year.',
  },
  sable: {
    intro: 'I do not start fights. I finish the half-second after yours.',
    rivals: ['kaito', 'rieko', 'bruno'],
    boss: 'goliath',
    mid: ['You struck first. That was the mistake.', 'All that speed, and still a gap to punish.', 'You committed. I only had to answer.'],
    outro: 'Sable steps back over the fallen guard. After you, as always.',
  },
  goliath: {
    intro: 'They built a bracket to reach me. Let them climb.',
    rivals: ['rieko', 'anira', 'sable'],
    boss: 'kaito',
    mid: ['The distance was mine.', 'You left the ground. The ground was mine too.', 'You waited. I have more reach than you have patience.'],
    outro: 'Goliath stands alone in the ring, exactly as the ring was designed.',
  },
};

export function buildStory(id: string): Beat[] {
  const arc = ARCS[id] ?? ARCS.kaito;
  const hero = getCharacter(id).name;
  const beats: Beat[] = [];
  const foes = [...arc.rivals, arc.boss];
  beats.push({ t: 'title', text: `${hero.toUpperCase()} — STORY` });
  beats.push({ t: 'line', who: id, text: arc.intro });
  foes.forEach((opp, i) => {
    const oc = getCharacter(opp);
    beats.push({ t: 'title', text: `CHAPTER ${i + 1}` });
    beats.push({ t: 'line', who: opp, text: oc.quote });
    beats.push({
      t: 'fight',
      opp,
      title: i === foes.length - 1 ? `${hero} vs ${oc.name} · FINAL` : `${hero} vs ${oc.name}`,
    });
    beats.push({ t: 'line', who: id, text: arc.mid[i] ?? 'One more.' });
  });
  beats.push({ t: 'title', text: 'ENDING' });
  beats.push({ t: 'line', who: id, text: arc.outro });
  beats.push({ t: 'title', text: 'THE END' });
  return beats;
}
