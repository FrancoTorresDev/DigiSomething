import { db } from './firebase'
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  increment
} from 'firebase/firestore'
import type { Deck, DeckVersion, DeckMatch, DeckMatchup } from '@/models/Deck'

const COL = 'decks'

export async function getUserDecks(uid: string): Promise<Deck[]> {
  const q = query(collection(db, COL), where('ownerId', '==', uid))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Deck)
}

export async function saveDeck(deck: Omit<Deck, 'id' | 'createdAt'>): Promise<string> {
  const ref = await addDoc(collection(db, COL), {
    ...deck,
    createdAt: serverTimestamp()
  })
  return ref.id
}

export async function updateDeck(id: string, data: Partial<Deck>): Promise<void> {
  await updateDoc(doc(db, COL, id), data as Record<string, unknown>)
}

export async function deleteDeck(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id))
}

export async function getTopDecks(limitCount = 20): Promise<Deck[]> {
  const q = query(
    collection(db, COL),
    where('isPublic', '==', true),
    orderBy('votes', 'desc'),
    limit(limitCount)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Deck)
}

export async function incrementVote(deckId: string): Promise<void> {
  await updateDoc(doc(db, COL, deckId), { votes: increment(1) })
}

export async function hasUserVoted(uid: string, deckId: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'users', uid, 'votes', deckId))
  return snap.exists()
}

export async function recordUserVote(uid: string, deckId: string): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'votes', deckId), { at: serverTimestamp() })
}

export async function getUserVotedIds(uid: string): Promise<string[]> {
  const snap = await getDocs(collection(db, 'users', uid, 'votes'))
  return snap.docs.map((d) => d.id)
}

export async function getDeckById(id: string): Promise<Deck | null> {
  const snap = await getDoc(doc(db, COL, id))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Deck
}

export async function saveDeckVersion(
  deckId: string,
  version: Omit<DeckVersion, 'id'>
): Promise<string> {
  const ref = await addDoc(collection(db, COL, deckId, 'versions'), {
    ...version,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function getDeckVersions(deckId: string): Promise<DeckVersion[]> {
  const q = query(
    collection(db, COL, deckId, 'versions'),
    orderBy('versionNumber', 'asc')
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as DeckVersion)
}

export async function saveGuide(deckId: string, guide: string): Promise<void> {
  await updateDoc(doc(db, COL, deckId), { guide })
}

export async function saveMatch(
  deckId: string,
  match: Omit<DeckMatch, 'id'>
): Promise<string> {
  const ref = await addDoc(collection(db, COL, deckId, 'matches'), {
    ...match,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function getMatches(deckId: string): Promise<DeckMatch[]> {
  const q = query(
    collection(db, COL, deckId, 'matches'),
    orderBy('createdAt', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as DeckMatch)
}

export async function deleteMatch(deckId: string, matchId: string): Promise<void> {
  await deleteDoc(doc(db, COL, deckId, 'matches', matchId))
}

export async function saveMatchup(
  deckId: string,
  matchup: Omit<DeckMatchup, 'id'>
): Promise<string> {
  const ref = await addDoc(collection(db, COL, deckId, 'matchups'), {
    ...matchup,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function getMatchups(deckId: string): Promise<DeckMatchup[]> {
  const q = query(
    collection(db, COL, deckId, 'matchups'),
    orderBy('createdAt', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as DeckMatchup)
}

export async function deleteMatchup(deckId: string, matchupId: string): Promise<void> {
  await deleteDoc(doc(db, COL, deckId, 'matchups', matchupId))
}
