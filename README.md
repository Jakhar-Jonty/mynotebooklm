# NotebookLM

A modern Next.js application built with Tailwind CSS and shadcn/ui components. This project showcases a beautiful, responsive design with accessible and customizable UI components.

## 🚀 Features

- **Next.js 15** - The React framework for production with App Router
- **Tailwind CSS** - Utility-first CSS framework for rapid UI development
- **shadcn/ui** - Beautiful, accessible, and customizable components
- **JavaScript** - Modern JavaScript without TypeScript complexity
- **Responsive Design** - Mobile-first approach with beautiful gradients
- **Dark Mode Support** - Built-in dark mode with Tailwind CSS
- **Modern UI** - Clean, professional design with smooth animations

## 🛠️ Tech Stack

- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS v4
- **Components**: shadcn/ui (Radix UI + Tailwind)
- **Language**: JavaScript
- **Fonts**: Geist Sans & Geist Mono
- **Icons**: Lucide React

## 📦 Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd notebooklm
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🎨 Components Included

The project includes the following shadcn/ui components:

- **Button** - Various styles and variants (default, secondary, outline, ghost, destructive)
- **Card** - Content containers with header, content, and description
- **Input** - Form input fields with proper styling
- **Label** - Accessible form labels

## 📁 Project Structure

```
notebooklm/
├── src/
│   ├── app/
│   │   ├── globals.css          # Global styles and Tailwind imports
│   │   ├── layout.js            # Root layout component
│   │   └── page.js              # Home page with component showcase
│   ├── components/
│   │   └── ui/                  # shadcn/ui components
│   │       ├── button.js
│   │       ├── card.js
│   │       ├── input.js
│   │       └── label.js
│   └── lib/
│       └── utils.js             # Utility functions
├── public/                      # Static assets
├── components.json              # shadcn/ui configuration
├── tailwind.config.js           # Tailwind CSS configuration
└── package.json
```

## 🎯 Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production with Turbopack
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## 🎨 Customization

### Adding More shadcn/ui Components

To add more components from shadcn/ui:

```bash
npx shadcn@latest add <component-name>
```

For example:
```bash
npx shadcn@latest add dialog
npx shadcn@latest add dropdown-menu
npx shadcn@latest add toast
```

### Styling

The project uses Tailwind CSS with a custom color palette. You can customize colors, spacing, and other design tokens in the `tailwind.config.js` file.

### Dark Mode

Dark mode is automatically supported through Tailwind CSS classes. The components will automatically adapt to the user's system preference.

## 📱 Responsive Design

The application is fully responsive and includes:

- Mobile-first design approach
- Responsive navigation
- Adaptive grid layouts
- Touch-friendly interactive elements

## 🔧 Configuration Files

- `components.json` - shadcn/ui configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `next.config.js` - Next.js configuration
- `postcss.config.mjs` - PostCSS configuration

## 🚀 Deployment

This project can be deployed to various platforms:

- **Vercel** (Recommended for Next.js)
- **Netlify**
- **Railway**
- **AWS Amplify**

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

If you have any questions or need help, please open an issue on GitHub.

---

Built with ❤️ using Next.js, Tailwind CSS, and shadcn/ui
