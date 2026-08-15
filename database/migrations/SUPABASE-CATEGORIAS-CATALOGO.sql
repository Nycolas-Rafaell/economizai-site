-- Execute uma vez no SQL Editor do Supabase.
-- Sincroniza o catálogo de categorias e tipos usados pelo Economizaí.
-- É seguro executar novamente: registros existentes são preservados e têm somente o nome atualizado.

insert into public.categories (slug, name) values
  -- Categorias principais
  ('perifericos', 'Periféricos'),
  ('hardware', 'Hardware'),
  ('informatica', 'Informática'),
  ('smartphones', 'Celulares e Tablets'),
  ('tvs-audio', 'TVs e Áudio'),
  ('games', 'Games'),
  ('casa-cozinha', 'Casa e Cozinha'),
  ('bebes', 'Bebês e Crianças'),
  ('saude-beleza', 'Saúde e Beleza'),
  ('ferramentas-auto', 'Ferramentas e Auto'),
  ('moda-acessorios', 'Moda e Acessórios'),
  ('esporte-lazer', 'Esporte e Lazer'),
  ('pet-shop', 'Pet Shop'),
  ('supermercado', 'Supermercado'),
  ('livros-papelaria', 'Livros e Papelaria'),
  ('outros', 'Outros'),

  -- Tipos de Periféricos
  ('headset', 'Headset'), ('microfone', 'Microfone'), ('teclado', 'Teclado'),
  ('mouse', 'Mouse'), ('monitor', 'Monitor'), ('webcam', 'Webcam'), ('outro-periferico', 'Outro periférico'),
  -- Tipos de Hardware
  ('ssd', 'SSD'), ('memoria-ram', 'Memória RAM'), ('placa-de-video', 'Placa de vídeo'),
  ('processador', 'Processador'), ('placa-mae', 'Placa-mãe'), ('fonte', 'Fonte'), ('outro-hardware', 'Outro hardware'),
  -- Tipos de Celulares e Tablets
  ('smartphone', 'Smartphone'), ('tablet', 'Tablet'), ('smartwatch', 'Smartwatch'),
  ('acessorio', 'Acessório'), ('carregador', 'Carregador'),
  -- Tipos de TVs e Áudio
  ('tv', 'TV'), ('caixa-de-som', 'Caixa de som'), ('fone-de-ouvido', 'Fone de ouvido'),
  ('soundbar', 'Soundbar'), ('projetor', 'Projetor'), ('outro-audio', 'Outro áudio'),
  -- Tipos de Games
  ('console', 'Console'), ('jogo', 'Jogo'), ('controle', 'Controle'),
  ('cadeira-gamer', 'Cadeira gamer'), ('acessorio-gamer', 'Acessório gamer'),
  -- Tipos de Informática
  ('notebook', 'Notebook'), ('computador', 'Computador'), ('impressora', 'Impressora'),
  ('camera', 'Câmera'), ('rede', 'Rede'), ('outro-item-de-informatica', 'Outro item de informática'),
  -- Tipos de Casa e Cozinha
  ('eletrodomestico', 'Eletrodoméstico'), ('cozinha', 'Cozinha'), ('limpeza', 'Limpeza'),
  ('organizacao', 'Organização'), ('moveis', 'Móveis'), ('outro-item-para-casa', 'Outro item para casa'),
  -- Tipos de Bebês e Crianças
  ('higiene', 'Higiene'), ('fraldas', 'Fraldas'), ('alimentacao', 'Alimentação'),
  ('brinquedo-infantil', 'Brinquedo infantil'), ('passeio', 'Passeio'), ('outro-item-infantil', 'Outro item infantil'),
  -- Tipos de Saúde e Beleza
  ('cuidados-pessoais', 'Cuidados pessoais'), ('skincare', 'Skincare'), ('maquiagem', 'Maquiagem'),
  ('perfume', 'Perfume'), ('suplemento', 'Suplemento'), ('outro-item-de-beleza', 'Outro item de beleza'),
  -- Tipos de Ferramentas e Auto
  ('ferramenta', 'Ferramenta'), ('acessorio-automotivo', 'Acessório automotivo'), ('pneu', 'Pneu'),
  ('manutencao', 'Manutenção'), ('moto', 'Moto'), ('outro-item', 'Outro item'),
  -- Tipos de Moda e Acessórios
  ('roupa', 'Roupa'), ('calcado', 'Calçado'), ('bolsa', 'Bolsa'), ('relogio', 'Relógio'), ('joia', 'Joia'),
  -- Tipos de Esporte e Lazer
  ('academia', 'Academia'), ('ciclismo', 'Ciclismo'), ('camping', 'Camping'), ('esporte', 'Esporte'), ('lazer', 'Lazer'),
  -- Tipos de Pet Shop
  ('racao', 'Ração'), ('higiene-pet', 'Higiene pet'), ('brinquedo-pet', 'Brinquedo pet'),
  ('acessorio-pet', 'Acessório pet'), ('saude-pet', 'Saúde pet'),
  -- Tipos de Supermercado
  ('alimento', 'Alimento'), ('bebida', 'Bebida'), ('limpeza-domestica', 'Limpeza doméstica'),
  ('papelaria-domestica', 'Papelaria doméstica'), ('pet-food', 'Pet food'),
  -- Tipos de Livros e Papelaria e Outros
  ('livro', 'Livro'), ('papelaria', 'Papelaria'), ('arte', 'Arte'),
  ('instrumento-musical', 'Instrumento musical'), ('colecionavel', 'Colecionável'), ('outro', 'Outro')
on conflict (slug) do update set name = excluded.name;
