import fs from 'node:fs';
import path from 'node:path';
import Loader from './loader';

// Zyron's screens are the original, tested vanilla modules in /public/app.
// This page renders their markup on the server; <Loader/> then loads them in order.
const html = fs.readFileSync(path.join(process.cwd(), 'app', 'body.html'), 'utf8');

export default function Page() {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <Loader />
    </>
  );
}
