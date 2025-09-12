const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Configuration for image optimization
const OPTIMIZATION_CONFIG = {
  jpeg: {
    quality: 80,
    progressive: true,
    mozjpeg: true
  },
  webp: {
    quality: 85,
    effort: 6
  },
  png: {
    compressionLevel: 9,
    progressive: true
  },
  // Maximum dimensions for different image types
  maxDimensions: {
    thumbnail: { width: 400, height: 300 },
    spot: { width: 800, height: 600 },
    detail: { width: 1200, height: 900 }
  }
};

// Get all image files recursively
function getImageFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      getImageFiles(filePath, fileList);
    } else if (/\.(jpg|jpeg|png|webp)$/i.test(file)) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Determine image type based on filename
function getImageType(filename) {
  if (filename.includes('thumbnail')) return 'thumbnail';
  if (filename.includes('spot') && /spot\d+\.jpg$/i.test(filename)) return 'spot';
  return 'detail';
}

// Optimize a single image
async function optimizeImage(inputPath, outputPath = null) {
  try {
    const filename = path.basename(inputPath);
    const imageType = getImageType(filename);
    const maxDims = OPTIMIZATION_CONFIG.maxDimensions[imageType];
    
    // Create backup if optimizing in place
    if (!outputPath) {
      const backupPath = inputPath.replace(/\.(jpg|jpeg|png|webp)$/i, '.backup.$1');
      if (!fs.existsSync(backupPath)) {
        fs.copyFileSync(inputPath, backupPath);
      }
      outputPath = inputPath;
    }
    
    const originalStats = fs.statSync(inputPath);
    const originalSize = originalStats.size;
    
    let pipeline = sharp(inputPath)
      .resize(maxDims.width, maxDims.height, {
        fit: 'inside',
        withoutEnlargement: true
      });
    
    // Apply format-specific optimizations
    const ext = path.extname(inputPath).toLowerCase();
    
    if (ext === '.jpg' || ext === '.jpeg') {
      pipeline = pipeline.jpeg(OPTIMIZATION_CONFIG.jpeg);
    } else if (ext === '.png') {
      pipeline = pipeline.png(OPTIMIZATION_CONFIG.png);
    } else if (ext === '.webp') {
      pipeline = pipeline.webp(OPTIMIZATION_CONFIG.webp);
    }
    
    await pipeline.toFile(outputPath + '.tmp');
    
    // Replace original with optimized version
    fs.renameSync(outputPath + '.tmp', outputPath);
    
    const newStats = fs.statSync(outputPath);
    const newSize = newStats.size;
    const savings = ((originalSize - newSize) / originalSize * 100).toFixed(1);
    
    console.log(`✅ ${filename}: ${(originalSize/1024).toFixed(1)}KB → ${(newSize/1024).toFixed(1)}KB (${savings}% reduction)`);
    
    return { originalSize, newSize, savings: parseFloat(savings) };
  } catch (error) {
    console.error(`❌ Error optimizing ${inputPath}:`, error.message);
    return null;
  }
}

// Main optimization function
async function optimizeAllImages() {
  const assetsDir = path.join(__dirname, '..', 'assets', 'images');
  
  if (!fs.existsSync(assetsDir)) {
    console.error('❌ Assets directory not found:', assetsDir);
    return;
  }
  
  console.log('🚀 Starting image optimization...');
  console.log('📁 Scanning directory:', assetsDir);
  
  const imageFiles = getImageFiles(assetsDir);
  console.log(`📸 Found ${imageFiles.length} images to optimize`);
  
  let totalOriginalSize = 0;
  let totalNewSize = 0;
  let optimizedCount = 0;
  
  for (const imagePath of imageFiles) {
    const result = await optimizeImage(imagePath);
    if (result) {
      totalOriginalSize += result.originalSize;
      totalNewSize += result.newSize;
      optimizedCount++;
    }
  }
  
  const totalSavings = ((totalOriginalSize - totalNewSize) / totalOriginalSize * 100).toFixed(1);
  
  console.log('\n📊 Optimization Summary:');
  console.log(`✅ Optimized: ${optimizedCount}/${imageFiles.length} images`);
  console.log(`💾 Total size: ${(totalOriginalSize/1024/1024).toFixed(2)}MB → ${(totalNewSize/1024/1024).toFixed(2)}MB`);
  console.log(`🎯 Total savings: ${totalSavings}% (${((totalOriginalSize - totalNewSize)/1024/1024).toFixed(2)}MB)`);
  
  // Generate WebP versions for better performance
  console.log('\n🔄 Generating WebP versions for better performance...');
  await generateWebPVersions(imageFiles);
}

// Generate WebP versions of images for better performance
async function generateWebPVersions(imageFiles) {
  for (const imagePath of imageFiles) {
    try {
      const ext = path.extname(imagePath).toLowerCase();
      if (ext === '.webp') continue; // Skip if already WebP
      
      const webpPath = imagePath.replace(/\.(jpg|jpeg|png)$/i, '.webp');
      
      // Skip if WebP version already exists
      if (fs.existsSync(webpPath)) continue;
      
      const filename = path.basename(imagePath);
      const imageType = getImageType(filename);
      const maxDims = OPTIMIZATION_CONFIG.maxDimensions[imageType];
      
      await sharp(imagePath)
        .resize(maxDims.width, maxDims.height, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .webp(OPTIMIZATION_CONFIG.webp)
        .toFile(webpPath);
      
      const originalStats = fs.statSync(imagePath);
      const webpStats = fs.statSync(webpPath);
      const savings = ((originalStats.size - webpStats.size) / originalStats.size * 100).toFixed(1);
      
      console.log(`🌐 ${filename} → WebP: ${savings}% smaller`);
    } catch (error) {
      console.error(`❌ Error creating WebP for ${imagePath}:`, error.message);
    }
  }
}

// Run optimization if called directly
if (require.main === module) {
  optimizeAllImages().catch(console.error);
}

module.exports = { optimizeAllImages, optimizeImage };