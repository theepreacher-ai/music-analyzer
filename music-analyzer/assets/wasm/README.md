# WASM binaries go here
# WASM Modules

This directory is reserved for WebAssembly modules that would enhance the audio processing capabilities.

## Potential Modules

### Spleeter.wasm
A compiled version of Deezer's Spleeter for high-quality vocal separation. This would require:
- Compiling Spleeter's TensorFlow model to WASM
- Significant file size (10-50MB)
- Not included in this demo due to size constraints

### Chord-Detect.wasm
A compiled chord detection algorithm for more accurate analysis. This could include:
- Pre-trained neural network for chord recognition
- Real-time FFT processing
- Optimized template matching

## Current Implementation

The current JavaScript implementation provides:
- Basic vocal separation using spectral subtraction
- Heuristic-based instrument detection
- Template matching for chord detection

These methods work well for demonstration purposes but could be enhanced with WASM modules for:
- Better accuracy
- Faster processing
- More sophisticated algorithms

## How to Add WASM Modules

1. Place `.wasm` files in this directory
2. Update the corresponding JavaScript modules to load WASM
3. Add fallback to pure JavaScript if WASM fails to load

Example loading code:
```javascript
async loadWASM() {
    try {
        const response = await fetch('assets/wasm/spleeter.wasm');
        const bytes = await response.arrayBuffer();
        const module = await WebAssembly.instantiate(bytes);
        return module.instance.exports;
    } catch (error) {
        console.warn('WASM not available, using JS fallback');
        return null;
    }
}
```

## License Considerations

Be aware that some audio processing algorithms may have licensing restrictions. Always verify licenses before including WASM modules in production.

