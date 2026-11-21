import type { NightDigest } from '../digest/types.js';

export function DigestPage({ night, digest }: { night: string; digest: NightDigest }) {
  return (
    <>
      <h1>morning digest · {night}</h1>
      {digest.badLines > 0 && (
        <p class="warn">{digest.badLines} malformed {digest.badLines === 1 ? 'line' : 'lines'} skipped</p>
      )}
      {digest.rows.length === 0 ? (
        <p class="mute">{digest.badLines ? 'no readable runs' : 'nothing ran'}</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th scope="col">job</th>
              <th scope="col">owner</th>
              <th scope="col">runs</th>
              <th scope="col">retries</th>
              <th scope="col">last status</th>
              <th scope="col">last error</th>
              <th scope="col">first run</th>
              <th scope="col">last run</th>
            </tr>
          </thead>
          <tbody>
            {digest.rows.map((row) => (
              <tr>
                <th scope="row">{row.job}</th>
                <td>{row.owner ?? '—'}</td>
                <td>{row.runs}</td>
                <td>{row.retries >= 3 ? <strong class="warn">{row.retries}</strong> : row.retries}</td>
                <td>
                  {row.hasFailure ? (
                    <strong class="warn">{row.lastStatus}{row.lastStatus !== 'fail' && ' (earlier fail)'}</strong>
                  ) : row.lastStatus}
                </td>
                <td>{row.lastError ?? '—'}</td>
                <td>{row.firstAt}</td>
                <td>{row.lastAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
