/** Проверенные фото Unsplash (все отдают 200). Ширина подбирается под экран. */
const unsplash = (id: string, width = 1200): string =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=72`;

const ids = {
  buildings: [
    'photo-1545324418-cc1a3fa10c00',
    'photo-1486406146926-c627a92ad1ab',
    'photo-1460317442991-0ec209397118',
    'photo-1574362848149-11496d93a7c7',
    'photo-1567496898669-ee935f5f647a',
    'photo-1515263487990-61b07816b324',
    'photo-1430285561322-7808604715df',
    'photo-1479839672679-a46483c0e7c8',
    'photo-1487958449943-2429e8be8625',
  ],
  houses: [
    'photo-1600585154340-be6161a56a0c',
    'photo-1600596542815-ffad4c1539a9',
    'photo-1600047509807-ba8f99d2cdde',
    'photo-1494526585095-c41746248156',
    'photo-1564013799919-ab600027ffc6',
    'photo-1570129477492-45c003edd2be',
    'photo-1580587771525-78b9dba3b914',
    'photo-1568605114967-8130f3a36994',
    'photo-1583608205776-bfd35f0d9f83',
    'photo-1600585154526-990dced4db0d',
    'photo-1605276374104-dee2a0ed3cd6',
    'photo-1512917774080-9991f1c4c750',
  ],
  living: [
    'photo-1502672260266-1c1ef2d93688',
    'photo-1522708323590-d24dbb6b0267',
    'photo-1560448204-e02f11c3d0e2',
    'photo-1493809842364-78817add7ffb',
    'photo-1586023492125-27b2c045efd7',
    'photo-1560185007-cde436f6a4d0',
    'photo-1560185893-a55cbc8c57e8',
    'photo-1600210492486-724fe5c67fb0',
    'photo-1600607687939-ce8a6c25118c',
    'photo-1600566753190-17f0baa2a6c3',
    'photo-1600573472592-401b489a3cdc',
    'photo-1616594039964-ae9021a400a0',
    'photo-1512918728675-ed5a9ecdebfd',
    'photo-1502005229762-cf1b2da7c5d6',
    'photo-1554995207-c18c203602cb',
    'photo-1565183997392-2f6f122e5912',
    'photo-1556020685-ae41abfc9365',
    'photo-1618221195710-dd6b41faaea6',
    'photo-1618219908412-a29a1bb7b86e',
    'photo-1513694203232-719a280e022f',
    'photo-1448630360428-65456885c650',
    'photo-1536376072261-38c75010e6c9',
  ],
  kitchens: [
    'photo-1484154218962-a197022b5858',
    'photo-1556911220-bff31c812dba',
    'photo-1600121848594-d8644e57abab',
    'photo-1600489000022-c2086d79f9d4',
  ],
  bedrooms: [
    'photo-1505691938895-1758d7feb511',
    'photo-1540518614846-7eded433c457',
    'photo-1615873968403-89e068629265',
    'photo-1595526114035-0d45ed16cfbf',
    'photo-1631049307264-da0ec9d70304',
    'photo-1505693416388-ac5ce068fe85',
  ],
  bathrooms: [
    'photo-1617104678098-de229db51175',
    'photo-1600566752355-35792bedcfea',
    'photo-1584622650111-993a426fbf0a',
    'photo-1552321554-5fefe8c9ef14',
  ],
  offices: ['photo-1497366216548-37526070297c', 'photo-1497366811353-6870744d04b2'],
} as const;

export type ImageGroup = keyof typeof ids;

export function pickImage(group: ImageGroup, index: number, width?: number): string {
  const list = ids[group];
  const id = list[Math.abs(index) % list.length] ?? list[0];
  return unsplash(id, width);
}

/** Набор фото для объявления: обложка по типу + интерьеры. */
export function galleryFor(kind: 'apartment' | 'house' | 'commercial', seed: number): string[] {
  if (kind === 'commercial') {
    return [pickImage('offices', seed), pickImage('buildings', seed + 1), pickImage('offices', seed + 1), pickImage('living', seed + 3)];
  }
  const cover = kind === 'house' ? pickImage('houses', seed) : pickImage('living', seed);
  return [
    cover,
    pickImage('living', seed + 5),
    pickImage('kitchens', seed),
    pickImage('bedrooms', seed),
    pickImage('bathrooms', seed),
    kind === 'house' ? pickImage('houses', seed + 3) : pickImage('buildings', seed),
  ];
}
