export const metadata = { title: 'Dashboard — Zyron Store', robots: { index: false } };
export default function L({ children }) {
  return (<><link rel="stylesheet" href="/app/store.css" /><div className="sx">{children}</div></>);
}
