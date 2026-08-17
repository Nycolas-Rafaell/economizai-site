-- Execute no SQL Editor do Supabase.
-- Complementa o catálogo do Economizaí com as categorias do PDF enviado.
-- Seguro para executar mais de uma vez.

insert into public.categories (slug, name) values
  ('acessorios-veiculos', 'Acessórios para Veículos'),
  ('agro', 'Agro'),
  ('alimentos-bebidas', 'Alimentos e Bebidas'),
  ('antiguidades-colecoes', 'Antiguidades e Coleções'),
  ('arte-papelaria-armarinho', 'Arte, Papelaria e Armarinho'),
  ('bebes', 'Bebês'),
  ('beleza-cuidados', 'Beleza e Cuidado Pessoal'),
  ('brinquedos-hobbies', 'Brinquedos e Hobbies'),
  ('moda', 'Calçados, Roupas e Bolsas'),
  ('cameras-acessorios', 'Câmeras e Acessórios'),
  ('veiculos', 'Carros, Motos e Outros'),
  ('casa-moveis', 'Casa, Móveis e Decoração'),
  ('celulares-telefones', 'Celulares e Telefones'),
  ('construcao', 'Construção'),
  ('eletrodomesticos', 'Eletrodomésticos'),
  ('eletronicos-audio-video', 'Eletrônicos, Áudio e Vídeo'),
  ('esportes-fitness', 'Esportes e Fitness'),
  ('ferramentas', 'Ferramentas'),
  ('festas-lembrancinhas', 'Festas e Lembrancinhas'),
  ('games', 'Games'),
  ('imoveis', 'Imóveis'),
  ('industria-comercio', 'Indústria e Comércio'),
  ('informatica', 'Informática'),
  ('ingressos', 'Ingressos'),
  ('instrumentos-musicais', 'Instrumentos Musicais'),
  ('joias-relogios', 'Joias e Relógios'),
  ('livros-revistas-comics', 'Livros, Revistas e Comics'),
  ('musica-filmes-seriados', 'Música, Filmes e Seriados'),
  ('pet-shop', 'Pet Shop'),
  ('saude', 'Saúde'),
  ('servicos', 'Serviços'),
  ('supermercado', 'Supermercado')
on conflict (slug) do update set name = excluded.name;
