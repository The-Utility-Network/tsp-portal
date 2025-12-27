'use client';
import { useState, useEffect } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import parse from 'html-react-parser';
import { FaFacebook, FaInstagram, FaMedium, FaYoutube, FaGoogle, FaXTwitter, FaDiscord } from 'react-icons/fa6';

// === Medium Feed URL ===
const MEDIUM_RSS_URL = 'https://medium.com/feed/@omgrown.life';

// === Utility functions for Medium posts ===

// Extract the first image from the HTML content
const extractFirstImage = (htmlString: string) => {
  const imgTag = htmlString.match(/<img[^>]+src="([^">]+)"/);
  return imgTag ? imgTag[1] : null;
};

// Remove the first image or figure tag from the HTML content so it isn’t duplicated
const removeFirstImageOrFigure = (htmlString: string) => {
  return htmlString.replace(/<figure[^>]*>.*?<\/figure>|<img[^>]+>/, '');
};

// Placeholder image if an image fails to load
const PLACEHOLDER_IMAGE = 'https://storage.googleapis.com/tgl_cdn/images/TSPBanner9.png';

export default function LearnForm() {
  // === Medium State ===
  const [mediumArticles, setMediumArticles] = useState<any[]>([]);
  const [expandedTileMedium, setExpandedTileMedium] = useState<number | null>(null);
  const [expandedSectionMedium, setExpandedSectionMedium] = useState<boolean>(false);
  const [brokenImagesMedium, setBrokenImagesMedium] = useState<{ [key: number]: boolean }>({});

  // === Fetch Medium Articles ===
  useEffect(() => {
    const fetchMediumPosts = async () => {
      try {
        const response = await axios.get(
          `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(MEDIUM_RSS_URL)}`
        );
        const feedData = response.data.items;
        setMediumArticles(feedData);
      } catch (error) {
        console.error('Error fetching Medium feed:', error);
      }
    };

    fetchMediumPosts();
  }, []);

  // === Load Instagram Embed Script on mount and apply basic styling ===
  useEffect(() => {
    // Inject global CSS for Instagram embed container
    const styleId = 'instagram-theme-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        .instagram-media {
          border-radius: 12px !important;
          margin: 0 auto !important;
          max-width: 100% !important;
          width: 100% !important;
        }
      `;
      document.head.appendChild(style);
    }

    // Load Instagram embed script
    const scriptId = 'instagram-embed-script';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script') as unknown as HTMLScriptElement;
      script.id = scriptId;
      script.async = true;
      script.src = "//www.instagram.com/embed.js";
      document.body.appendChild(script);
      script.onload = () => {
        if ((window as any).instgrm) {
          (window as any).instgrm.Embeds.process();
        }
      };
    } else {
      if ((window as any).instgrm) {
        (window as any).instgrm.Embeds.process();
      }
    }
  }, []);

  // === Handlers for Medium Post Tiles ===
  const handleTileClickMedium = (index: number) => {
    setExpandedTileMedium((prev) => (prev === index ? null : index));
  };

  const handleImageErrorMedium = (index: number) => {
    setBrokenImagesMedium((prev) => ({ ...prev, [index]: true }));
  };

  // === Determine Medium Posts to Display ===
  const mediumToDisplay = expandedSectionMedium ? mediumArticles : mediumArticles.slice(0, 1);

  // === Instagram Embed Markup ===
  // Updated styles to fill the container (removing fixed max-width/min-width)
  const instagramEmbedMarkup = `
    <blockquote class="instagram-media" 
      data-instgrm-permalink="https://www.instagram.com/omgrown.life/?utm_source=ig_embed&amp;utm_campaign=loading" 
      data-instgrm-version="14" 
      style="
        background: rgba(0, 30, 40, 0.4) !important;
        border: 1px solid rgba(0, 204, 255, 0.2) !important;
        border-radius: 12px !important;
        box-shadow: 0 0 1px 0 rgba(0,0,0,0.5) !important, 0 1px 10px 0 rgba(0,0,0,0.15) !important;
        margin: 1px !important;
        padding: 0 !important;
        width: 100% !important;
        max-width: 100% !important;
        backdrop-filter: blur(12px) !important;
        -webkit-backdrop-filter: blur(12px) !important;
      ">
      <div style="padding:16px;">
        <a href="https://www.instagram.com/omgrown.life/?utm_source=ig_embed&amp;utm_campaign=loading" 
          style="background: transparent; line-height: 0; padding: 0; text-align: center; text-decoration: none; width: 100%;" 
          target="_blank">
          <div style="display: flex; flex-direction: row; align-items: center;">
            <div style="background-color: rgba(0, 204, 255, 0.5); border-radius: 50%; height: 40px; margin-right: 14px; width: 40px;"></div>
            <div style="display: flex; flex-direction: column; justify-content: center;">
              <div style="background-color: rgba(0, 204, 255, 0.5); border-radius: 4px; height: 14px; margin-bottom: 6px; width: 100px;"></div>
              <div style="background-color: rgba(0, 204, 255, 0.5); border-radius: 4px; height: 14px; width: 60px;"></div>
            </div>
          </div>
          <div style="padding: 19% 0;"></div>
          <div style="display:block; height:50px; margin:0 auto 12px; width:50px;">
            <svg width="50px" height="50px" viewBox="0 0 60 60" version="1.1" 
                xmlns="https://www.w3.org/2000/svg" xmlns:xlink="https://www.w3.org/1999/xlink">
              <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                <g transform="translate(-511.000000, -20.000000)" fill="rgba(0, 204, 255, 1)">
                  <g>
                    <path d="M556.869,30.41 C554.814,30.41 553.148,32.076 553.148,34.131 C553.148,36.186 554.814,37.852 556.869,37.852 C558.924,37.852 560.59,36.186 560.59,34.131 C560.59,32.076 558.924,30.41 556.869,30.41 M541,60.657 C535.114,60.657 530.342,55.887 530.342,50 C530.342,44.114 535.114,39.342 541,39.342 C546.887,39.342 551.658,44.114 551.658,50 C551.658,55.887 546.887,60.657 541,60.657 M541,33.886 C532.1,33.886 524.886,41.1 524.886,50 C524.886,58.899 532.1,66.113 541,66.113 C549.9,66.113 557.115,58.899 557.115,50 C557.115,41.1 549.9,33.886 541,33.886 M565.378,62.101 C565.244,65.022 564.756,66.606 564.346,67.663 C563.803,69.06 563.154,70.057 562.106,71.106 C561.058,72.155 560.06,72.803 558.662,73.347 C557.607,73.757 556.021,74.244 553.102,74.378 C549.944,74.521 548.997,74.552 541,74.552 C533.003,74.552 532.056,74.521 528.898,74.378 C525.979,74.244 524.393,73.757 523.338,73.347 C521.94,72.803 520.942,72.155 519.894,71.106 C518.846,70.057 518.197,69.06 517.654,67.663 C517.244,66.606 516.755,65.022 516.623,62.101 C516.479,58.943 516.448,57.996 516.448,50 C516.448,42.003 516.479,41.056 516.623,37.899 C516.755,34.978 517.244,33.391 517.654,32.338 C518.197,30.938 518.846,29.942 519.894,28.894 C520.942,27.846 521.94,27.196 523.338,26.654 C524.393,26.244 525.979,25.756 528.898,25.623 C532.057,25.479 533.004,25.448 541,25.448 C548.997,25.448 549.943,25.479 553.102,25.623 C556.021,25.756 557.607,26.244 558.662,26.654 C560.06,27.196 561.058,27.846 562.106,28.894 C563.154,29.942 563.803,30.938 564.346,32.338 C564.756,33.391 565.244,34.978 565.378,37.899 C565.522,41.056 565.552,42.003 565.552,50 C565.552,57.996 565.522,58.943 565.378,62.101 M570.82,37.631 C570.674,34.438 570.167,32.258 569.425,30.349 C568.659,28.377 567.633,26.702 565.965,25.035 C564.297,23.368 562.623,22.342 560.652,21.575 C558.743,20.834 556.562,20.326 553.369,20.18 C550.169,20.033 549.148,20 541,20 C532.853,20 531.831,20.033 528.631,20.18 C525.438,20.326 523.257,20.834 521.349,21.575 C519.376,22.342 517.703,23.368 516.035,25.035 C514.368,26.702 513.342,28.377 512.574,30.349 C511.834,32.258 511.326,34.438 511.181,37.631 C511.035,40.831 511,41.851 511,50 C511,58.147 511.035,59.17 511.181,62.369 C511.326,65.562 511.834,67.743 512.574,69.651 C513.342,71.625 514.368,73.296 516.035,74.965 C517.703,76.634 519.376,77.658 521.349,78.425 C523.257,79.167 525.438,79.673 528.631,79.82 C531.831,79.965 532.853,80.001 541,80.001 C549.148,80.001 550.169,79.965 553.369,79.82 C556.562,79.673 558.743,79.167 560.652,78.425 C562.623,77.658 564.297,76.634 565.965,74.965 C567.633,73.296 568.659,71.625 569.425,69.651 C570.167,67.743 570.674,65.562 570.82,62.369 C570.966,59.17 571,58.147 571,50 C571,41.851 570.966,40.831 570.82,37.631"></path>
                  </g>
                </g>
              </svg>
            </div>
            <div style="padding-top: 8px;">
              <div style="color:#FFFFFF; font-family:Arial,sans-serif; font-size:14px; font-weight:550; line-height:18px;">
                View this profile on Instagram
              </div>
            </div>
            <div style="padding: 12.5% 0;"></div>
            <div style="display: flex; flex-direction: row; margin-bottom: 14px; align-items: center;">
              <div>
                <div style="background-color: rgba(0, 204, 255, 1); border-radius: 50%; height: 12.5px; width: 12.5px; transform: translateY(7px);"></div>
                <div style="background-color: rgba(0, 204, 255, 1); height: 12.5px; transform: rotate(-45deg) translateX(3px) translateY(1px); width: 12.5px; margin: 0 14px;"></div>
                <div style="background-color: rgba(0, 204, 255, 1); border-radius: 50%; height: 12.5px; width: 12.5px; transform: translateX(9px) translateY(-18px);"></div>
              </div>
              <div style="margin-left: 8px;">
                <div style="background-color: rgba(0, 204, 255, 1); border-radius: 50%; height: 20px; width: 20px;"></div>
                <div style="width: 0; height: 0; border-top: 2px solid transparent; border-left: 6px solid #F4F4F4; border-bottom: 2px solid transparent; transform: translateX(16px) translateY(-4px) rotate(30deg);"></div>
              </div>
              <div style="margin-left: auto;">
                <div style="width: 0; border-top: 8px solid rgba(0, 204, 255, 1); border-right: 8px solid transparent; transform: translateY(16px);"></div>
                <div style="background-color: rgba(0, 204, 255, 1); height: 12px; width: 16px; transform: translateY(-4px);"></div>
                <div style="width: 0; height: 0; border-top: 8px solid #F4F4F4; border-left: 8px solid transparent; transform: translateY(-4px) translateX(8px);"></div>
              </div>
            </div>
            <div style="display: flex; flex-direction: column; justify-content: center; margin-bottom: 24px;">
              <div style="background-color: rgba(0, 204, 255, 1); border-radius: 4px; height: 14px; margin-bottom: 6px; width: 224px;"></div>
              <div style="background-color: rgba(0, 204, 255, 1); border-radius: 4px; height: 14px; width: 144px;"></div>
            </div>
          </a>
          <p style="color:#c9c8cd; font-family:Arial,sans-serif; font-size:14px; line-height:17px; margin:8px 0 7px; overflow:hidden; text-align:center; text-overflow:ellipsis; white-space:nowrap;">
            <a href="https://www.instagram.com/omgrown.life/?utm_source=ig_embed&amp;utm_campaign=loading" style="color:#c9c8cd; font-family:Arial,sans-serif; font-size:14px; font-weight:normal; line-height:17px;" target="_blank">
              The Satellite Project Om
            </a> (@
            <a href="https://www.instagram.com/omgrown.life/?utm_source=ig_embed&amp;utm_campaign=loading" style="color:#c9c8cd; font-family:Arial,sans-serif; font-size:14px; font-weight:normal; line-height:17px;" target="_blank">
              omgrown.life
            </a>) • Instagram photos and videos
          </p>
        </div>
      </blockquote>
  `;

  return (
    <div
      className="scroll-container custom-scrollbar isolate space-y-4 sm:space-y-6 rounded-2xl shadow-2xl bg-brand-950/50 p-3 sm:p-4 md:p-6 w-full mx-auto border border-brand-500/20"
      style={{
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        maxHeight: '80vh',
        overflowY: 'auto'
      }}
    >
      {/* Banner */}
      <div className="h-auto overflow-hidden rounded-xl ring-brand-300 ring-5 ring-inset border-2 border-brand-500">
        <img
          src="https://storage.googleapis.com/tgl_cdn/images/TSPBanner9.png"
          alt="Learn Banner"
          className="w-full object-cover"
        />
      </div>

      {/* Social Media Links */}
      <div className="flex justify-around my-4">
        <a href="https://discord.gg/q4tFymyAnx" target="_blank" className="text-white hover:text-brand-400 transition-colors">
          <FaDiscord size={28} />
        </a>
        <a href="https://www.facebook.com/people/Om-Grown-New-Mexico/61570483582852/" target="_blank" className="text-white hover:text-brand-400 transition-colors">
          <FaFacebook size={28} />
        </a>
        <a href="https://x.com/omgrownm" target="_blank" className="text-white hover:text-brand-400 transition-colors">
          <FaXTwitter size={28} />
        </a>
        <a href="https://maps.app.goo.gl/4erDDpKePRbNMkvn9" target="_blank" className="text-white hover:text-brand-400 transition-colors">
          <FaGoogle size={28} />
        </a>
        <a href="https://www.instagram.com/omgrown.life/" target="_blank" className="text-white hover:text-accent transition-colors">
          <FaInstagram size={28} />
        </a>
        <a href="https://medium.com/@omgrown.life" target="_blank" className="text-white hover:text-brand-400 transition-colors">
          <FaMedium size={28} />
        </a>
        <a href="https://www.youtube.com/@TSPOm" target="_blank" className="text-white hover:text-accent transition-colors">
          <FaYoutube size={28} />
        </a>
      </div>

      {/* === Instagram Section (moved to top) === */}
      <section>
        <div className="relative rounded-xl px-3 pb-1.5 pt-2.5 ring-1 ring-inset ring-brand-300 mb-4">
          <h2 className="block text-center text-lg font-medium text-brand-100">
            Instagram Feed
          </h2>
        </div>
        <div className="w-full" dangerouslySetInnerHTML={{ __html: instagramEmbedMarkup }} />
      </section>

      {/* === Medium Feed Section (placed below Instagram) === */}
      <section>
        <div className="relative rounded-xl px-3 pb-1.5 pt-2.5 ring-1 ring-inset ring-brand-300 mb-4">
          <h2 className="block text-center text-lg font-medium text-brand-100">
            Latest Medium Articles
          </h2>
        </div>
        {mediumToDisplay
          .filter((article) => extractFirstImage(article.description))
          .map((article, index) => {
            const firstImage = extractFirstImage(article.description);
            return (
              <div
                key={index}
                // Disable the hover scale when expanded to avoid overlapping issues
                className={`relative rounded-xl p-4 ring-1 ring-inset ring-brand-300 cursor-pointer transition-transform ${expandedTileMedium === index ? '' : 'transform hover:scale-105'
                  } mb-4`}
                onClick={() => handleTileClickMedium(index)}
              >
                <div className="flex items-center justify-between">
                  {/* Thumbnail */}
                  <div className="w-1/3">
                    <img
                      src={
                        brokenImagesMedium[index]
                          ? PLACEHOLDER_IMAGE
                          : firstImage || undefined
                      }
                      alt={article.title}
                      onError={() => handleImageErrorMedium(index)}
                      className="w-full h-auto rounded-lg object-cover"
                      style={{ aspectRatio: '16 / 9' }}
                    />
                  </div>
                  {/* Title & Toggle Info */}
                  <div className="w-2/3 pl-4">
                    <h3 className="text-lg font-semibold text-brand-100">
                      {article.title}
                    </h3>
                    <p className="text-sm text-brand-300">
                      {expandedTileMedium === index ? 'Click to collapse' : 'Click to expand'}
                    </p>
                    <ChevronDownIcon
                      className={`h-5 w-5 text-brand-100 transition-transform ${expandedTileMedium === index ? 'rotate-180' : ''
                        }`}
                    />
                  </div>
                </div>
                {expandedTileMedium === index && (
                  <div className="mt-4 text-white space-y-4 leading-relaxed">
                    {parse(removeFirstImageOrFigure(article.description))}
                    <a
                      href={article.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-block bg-accent hover:bg-accent/80 text-white py-2 px-6 rounded-full transition-colors duration-200 shadow-[0_0_10px_rgba(255,105,180,0.4)]"
                    >
                      Read More
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        {mediumArticles.length > 1 && (
          <button
            onClick={() => setExpandedSectionMedium((prev) => !prev)}
            className="w-full py-2 bg-brand-700 hover:bg-brand-600 text-white rounded-lg transition-colors"
          >
            {expandedSectionMedium ? 'Show Latest Only' : 'Expand to See More'}
          </button>
        )}
      </section>
    </div>
  );
}
