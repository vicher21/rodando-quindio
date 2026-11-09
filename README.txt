RODANDO QUINDIO - PRIMERA ENTREGA DE CODIGO

1. Crea el proyecto Next.js con:
   npx create-next-app@latest rodando-quindio
   Selecciona TypeScript, ESLint, Tailwind, src/, App Router y alias @/*.

2. Copia la carpeta src/app de este paquete dentro de tu proyecto (reemplazando los archivos page.tsx, layout.tsx y globals.css).

3. Ejecuta:
   cd rodando-quindio
   npm run dev

4. Abre http://localhost:3000

Esta entrega es la primera capa visual y de navegación. Los formularios son demostrativos:
todavía no guardan datos, no hay login real y los pedidos no se distribuyen a conductores.
La siguiente entrega conectará Supabase Auth, base de datos, permisos RLS y Realtime.
