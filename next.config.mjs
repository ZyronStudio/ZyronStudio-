/** @type {import('next').NextConfig} */
export default {
  headers: async () => [{ source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache' }] }],
};
