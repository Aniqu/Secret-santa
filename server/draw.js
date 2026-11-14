// Burtų traukimas: kiekvienas dalyvis gavėją gauna tik tada, kai atplėšia savo
// laišką, bet gavėjas parenkamas taip, kad likusieji visada galėtų užbaigti
// burtus (niekas nelieka su savimi pačiu ir niekas negauna dviejų dovanų).

function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Ar likę dalyviai dar gali pasidalinti likusius gavėjus, jei `giverId` gaus `recipientId`?
function canComplete(participants, giverId, recipientId) {
  const taken = new Set(participants.map((p) => p.recipientId).filter(Boolean));
  taken.add(recipientId);

  const givers = participants.filter((p) => !p.recipientId && p.id !== giverId).map((p) => p.id);
  const receivers = participants.filter((p) => !taken.has(p.id)).map((p) => p.id);
  const giverOf = new Map(); // gavėjas -> dovanotojas

  const assign = (giver, seen) => {
    for (const r of receivers) {
      if (r === giver || seen.has(r)) continue;
      seen.add(r);
      if (!giverOf.has(r) || assign(giverOf.get(r), seen)) {
        giverOf.set(r, giver);
        return true;
      }
    }
    return false;
  };

  return givers.every((g) => assign(g, new Set()));
}

export function pickRecipient(participants, giverId) {
  const taken = new Set(participants.map((p) => p.recipientId).filter(Boolean));
  const candidates = shuffle(participants.filter((p) => p.id !== giverId && !taken.has(p.id)));
  for (const c of candidates) {
    if (canComplete(participants, giverId, c.id)) return c.id;
  }
  return null;
}
