import { FaFacebook, FaTwitter, FaLinkedin } from 'react-icons/fa';

const Footer = () => {
  return (
    <footer className="bg-gray-200 dark:bg-black text-gray-700 dark:text-gray-300 pt-16 pb-8 border-t-2 border-gray-400 dark:border-gray-900">
      <div className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
        <div>
          <h3 className="text-gray-900 dark:text-white text-lg font-black mb-4">Company</h3>
          <ul className="space-y-2 text-sm">
            <li className="hover:text-orange-500 dark:hover:text-orange-400 cursor-pointer transition-colors font-semibold">About Us</li>
            <li className="hover:text-orange-500 dark:hover:text-orange-400 cursor-pointer transition-colors font-semibold">Careers</li>
            <li className="hover:text-orange-500 dark:hover:text-orange-400 cursor-pointer transition-colors font-semibold">Privacy Policy</li>
          </ul>
        </div>
        <div>
          <h3 className="text-gray-900 dark:text-white text-lg font-black mb-4">Resources</h3>
          <ul className="space-y-2 text-sm">
            <li className="hover:text-orange-500 dark:hover:text-orange-400 cursor-pointer transition-colors font-semibold">Blog</li>
            <li className="hover:text-orange-500 dark:hover:text-orange-400 cursor-pointer transition-colors font-semibold">Community</li>
          </ul>
        </div>
        <div>
          <h3 className="text-gray-900 dark:text-white text-lg font-black mb-4">Categories</h3>
          <ul className="space-y-2 text-sm">
            <li className="hover:text-orange-500 dark:hover:text-orange-400 cursor-pointer transition-colors font-semibold">Web & App Dev</li>
            <li className="hover:text-orange-500 dark:hover:text-orange-400 cursor-pointer transition-colors font-semibold">Digital Marketing</li>
          </ul>
        </div>
        <div>
          <h3 className="text-gray-900 dark:text-white text-lg font-black mb-4">Newsletter</h3>
          <div className="flex bg-white dark:bg-gray-800 rounded-full p-1 border-2 border-gray-400 dark:border-gray-700">
            <input 
              type="email" 
              placeholder="Your email" 
              className="bg-transparent px-4 py-1 text-gray-900 dark:text-white placeholder-gray-600 dark:placeholder-gray-400 focus:outline-none w-full font-semibold" 
            />
            <button className="bg-orange-500 hover:bg-orange-600 text-white p-2 rounded-full w-10 h-10 flex items-center justify-center transition-colors font-bold">
              →
            </button>
          </div>
          <div className="flex gap-4 mt-6 text-gray-700 dark:text-gray-300">
            <FaFacebook className="text-xl hover:text-orange-500 dark:hover:text-orange-400 cursor-pointer transition-colors" />
            <FaTwitter className="text-xl hover:text-orange-500 dark:hover:text-orange-400 cursor-pointer transition-colors" />
            <FaLinkedin className="text-xl hover:text-orange-500 dark:hover:text-orange-400 cursor-pointer transition-colors" />
          </div>
        </div>
      </div>
      <div className="text-center text-sm border-t-2 border-gray-400 dark:border-gray-900 pt-8 text-gray-700 dark:text-gray-300 font-semibold">
        © 2025 Apex Digital Services. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
