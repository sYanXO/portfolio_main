import { Routes, Route } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';
import Nav from './components/Nav';
import Footer from './components/Footer';
import Home from './pages/Home';
import About from './pages/About';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import Projects from './pages/Projects';
import NotFound from './pages/NotFound';

const App = () => {
  return (
    <>
      <ScrollToTop />
      <Nav />
      <main className="content-wrapper">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
};

export default App;
