'use strict';
// Records what GraphQL mergeQueue.entries reports, and applies the entry lookup
// from the spec (.ai/specs/2026-11-03-speculative-merge-queue.md § Design 2).
// It never fails the job: it prints EVIDENCE lines only.
const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
const group = { head_sha: process.env.HEAD_SHA, base_sha: process.env.BASE_SHA };
const label = process.argv[2] || 'lookup';
const QUERY = `query($owner: String!, $repo: String!, $first: Int!) {
  repository(owner: $owner, name: $repo) {
    mergeQueue(branch: "main") { entries(first: $first) {
      nodes { id position state enqueuedAt headCommit { oid } baseCommit { oid } pullRequest { number headRefOid } }
      pageInfo { hasNextPage }
    } }
  }
}`;
async function query(first) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { authorization: `bearer ${process.env.GITHUB_TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify({ query: QUERY, variables: { owner, repo, first } }),
  });
  return res.json();
}
function entryFrom(data) {
  const entries = data?.data?.repository?.mergeQueue?.entries;
  const nodes = entries?.nodes;
  if (!Array.isArray(nodes)) return { ok: false, reason: 'no entries' };
  const matches = nodes.filter(n => n.headCommit?.oid === group.head_sha);
  if (matches.length !== 1) return { ok: false, reason: `matches=${matches.length}` };
  const e = matches[0];
  if (e.baseCommit?.oid !== group.base_sha) return { ok: false, reason: 'baseCommit != group base', position: e.position };
  if (e.position !== 1 && e.position !== 2) return { ok: false, reason: `position ${e.position}` };
  if (e.position === 2) {
    const first = nodes.find(n => n.position === 1);
    if (first?.headCommit?.oid !== group.base_sha) return { ok: false, reason: 'position 1 head != group base', position: 2 };
  }
  return { ok: true, position: e.position, pr: e.pullRequest?.number };
}
(async () => {
  const at = new Date().toISOString();
  const wide = await query(10);
  console.log(`EVIDENCE ${label} at=${at} raw=${JSON.stringify(wide)}`);
  const window = await query(2);
  console.log(`EVIDENCE ${label} at=${at} window=${JSON.stringify(window)}`);
  console.log(`EVIDENCE ${label} at=${at} verdict=${JSON.stringify(entryFrom(window))}`);
})().catch(err => console.log(`EVIDENCE ${label} error=${err.message}`));
