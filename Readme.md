# ASCII Art Generator
A simple and interactive web application to convert your images into ASCII art. Upload an image, tweak the settings, and generate text-based art instantly.
## Features
- Image Upload: Works with PNG, JPG, and other standard image formats.
- Custom Dimensions: Set the width and height of the generated art.
- Aspect Ratio Lock: Maintain the original image's aspect ratio automatically.
- Multiple Detail Levels: Choose from several character sets, from minimal to detailed.
- Color Themes: Style the output with various classic terminal colors.
- Easy Export: Copy the art to your clipboard or download it as a .txt file.
- Dark/Light Mode: A sleek interface that respects your system theme or can be toggled manually.

---

## How It Works
The conversion process is handled entirely in the browser using JavaScript and the HTML Canvas API.
1. Image Analysis: When you upload an image, it's drawn onto a hidden <canvas> element.
2. Gridding: The application divides the canvas into a grid based on the output width and height you've set.
3. Brightness Calculation: For each cell in the grid, it calculates the average brightness (grayscale value) of all the pixels within it.
4. Character Mapping: This average brightness value is then mapped to a character from a predefined set (e.g., .,-+=*#%@). Darker image regions are assigned denser characters (like @ and #), while lighter regions get sparser characters (like . and ,).
5. Assembly: The characters are combined, row by row, to create the final text art displayed on the screen.

---

## Tech Stack
- Framework: Next.js
- Language: TypeScript
- Styling: Tailwind CSS
- UI Components: shadcn/ui
- Icons: Lucide React

## Getting Started
To run this project locally:
Clone the repository:
```bash
git clone https://github.com/Aditya-en/ascii-art.git
cd ascii-art
```

Install dependencies:
```bash
npm install
```

Run the development server:
```bash
npm run dev
```


Open http://localhost:3000 in your browser to see the result.
