const prisma = require('../lib/prisma');

async function syncBrands() {
  console.log('--- Syncing Product Brands ---');
  const officialBrands = await prisma.brand.findMany({ where: { isActive: true } });
  console.log(`Found ${officialBrands.length} official brands:`, officialBrands.map(b => b.name));

  const products = await prisma.product.findMany();
  console.log(`Found ${products.length} products to check.`);

  let updatedCount = 0;
  for (const prod of products) {
    let matchedBrand = prod.brand;

    if (!matchedBrand || !matchedBrand.trim()) {
      // Try to match from official brands list
      for (const ob of officialBrands) {
        const regex = new RegExp(`\\b${ob.name.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
        if (regex.test(prod.name)) {
          matchedBrand = ob.name;
          break;
        }
      }

      // Specific known aliases
      if (!matchedBrand) {
        const lowerName = prod.name.toLowerCase();
        if (lowerName.includes('iphone') || lowerName.includes('ipad') || lowerName.includes('macbook') || lowerName.includes('airpods')) {
          matchedBrand = 'Apple';
        } else if (lowerName.includes('galaxy')) {
          matchedBrand = 'Samsung';
        } else if (lowerName.includes('oneplus') || lowerName.includes('nord')) {
          matchedBrand = 'OnePlus';
        } else if (lowerName.includes('levis') || lowerName.includes("levi's")) {
          matchedBrand = "Levi's";
        } else if (lowerName.includes('lego')) {
          matchedBrand = 'LEGO';
        } else if (lowerName.includes('wildcraft')) {
          matchedBrand = 'Wildcraft';
        } else if (lowerName.includes('boat')) {
          matchedBrand = 'boAt';
        }
      }
    } else {
      // Standardize casing to match official brand if exists
      const match = officialBrands.find(b => b.name.toLowerCase() === matchedBrand.trim().toLowerCase());
      if (match) {
        matchedBrand = match.name;
      }
    }

    if (matchedBrand && matchedBrand !== prod.brand) {
      await prisma.product.update({
        where: { id: prod.id },
        data: { brand: matchedBrand }
      });
      console.log(`Updated product "${prod.name}": brand "${prod.brand || ''}" -> "${matchedBrand}"`);
      updatedCount++;
    }
  }

  console.log(`--- Finished: ${updatedCount} products updated with proper brands. ---`);
}

syncBrands()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });

