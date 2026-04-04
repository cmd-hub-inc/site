/**
 * Social Share Buttons Component
 * Displays share buttons for multiple platforms with tracking
 * Follows site theme with proper styling
 */

import { useState } from 'react';
import {
  Twitter,
  Facebook,
  Linkedin,
  MessageCircle,
  Share2,
} from 'lucide-react';

const ShareButtons = ({ command, user, onShare = null, shareUrl = null, theme = {}, title = 'Share this command' }) => {
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState(null);

  // Default theme (fallback if not provided)
  const defaultTheme = {
    bg: '#1e1f22',
    surface: '#2b2d31',
    border: 'rgba(255,255,255,0.06)',
    text: '#DBDEE1',
    muted: '#949BA4',
  };
  
  const colors = { ...defaultTheme, ...theme };

  const baseUrl = window.location.origin;
  
  // Generate share URLs based on what we have
  let shareTo = {};
  let commandIdForTracking = null;

  if (shareUrl) {
    // Custom share URL provided
    const encodedUrl = encodeURIComponent(shareUrl);
    const title = encodeURIComponent(command?.name || 'Check this out');
    
    shareTo = {
      twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${title}&via=DiscordCommands`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      discord: shareUrl,
      reddit: `https://reddit.com/submit?url=${encodedUrl}&title=${title}`,
    };
  } else if (command) {
    // Command object provided
    const commandUrl = `${baseUrl}/commands/${command.id}`;
    const encodedUrl = encodeURIComponent(commandUrl);
    const title = encodeURIComponent(command.name || 'Check out this command');

    shareTo = {
      twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${title}&via=DiscordCommands`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      discord: commandUrl,
      reddit: `https://reddit.com/submit?url=${encodedUrl}&title=${title}`,
    };
    commandIdForTracking = command.id;
  }

  const handleShare = async (platform) => {
    try {
      setShareError(null);

      // Track share if we have a command ID
      if (commandIdForTracking) {
        try {
          await fetch(`/api/commands/${commandIdForTracking}/shares`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ platform }),
          });
        } catch (e) {
          // Continue even if tracking fails
          console.error('Failed to track share:', e);
        }
      }

      // Open share URL
      if (platform === 'discord') {
        // Discord is special - copy to clipboard
        await navigator.clipboard.writeText(shareTo.discord);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        // Open platform share dialog
        window.open(shareTo[platform], '_blank', 'width=600,height=400');
      }

      if (onShare) {
        onShare(platform);
      }
    } catch (error) {
      console.error('Share error:', error);
      setShareError(`Failed to share to ${platform}`);
      setTimeout(() => setShareError(null), 3000);
    }
  };

  return (
    <div style={{
      background: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: 12,
      padding: 22,
      marginTop: 18,
    }}>
      <div style={{
        color: colors.text,
        fontWeight: 600,
        marginBottom: 12,
        fontSize: 15,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <Share2 size={18} />
        {title}
      </div>

      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
      }}>
        {/* Twitter/X */}
        <button
          onClick={() => handleShare('twitter')}
          title="Share on Twitter/X"
          aria-label="Share on Twitter"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 12px',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 500,
            transition: 'all 0.2s ease',
            color: 'white',
            background: '#1DA1F2',
          }}
          onMouseEnter={(e) => e.target.style.background = '#1a91da'}
          onMouseLeave={(e) => e.target.style.background = '#1DA1F2'}
        >
          <Twitter size={16} />
          <span>Tweet</span>
        </button>

        {/* Facebook */}
        <button
          onClick={() => handleShare('facebook')}
          title="Share on Facebook"
          aria-label="Share on Facebook"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 12px',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 500,
            transition: 'all 0.2s ease',
            color: 'white',
            background: '#4267B2',
          }}
          onMouseEnter={(e) => e.target.style.background = '#365899'}
          onMouseLeave={(e) => e.target.style.background = '#4267B2'}
        >
          <Facebook size={16} />
          <span>Share</span>
        </button>

        {/* LinkedIn */}
        <button
          onClick={() => handleShare('linkedin')}
          title="Share on LinkedIn"
          aria-label="Share on LinkedIn"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 12px',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 500,
            transition: 'all 0.2s ease',
            color: 'white',
            background: '#0077B5',
          }}
          onMouseEnter={(e) => e.target.style.background = '#006399'}
          onMouseLeave={(e) => e.target.style.background = '#0077B5'}
        >
          <Linkedin size={16} />
          <span>Share</span>
        </button>

        {/* Discord - Copy Link */}
        <button
          onClick={() => handleShare('discord')}
          title="Copy Discord share link"
          aria-label="Copy Discord share link"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 12px',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 500,
            transition: 'all 0.2s ease',
            color: 'white',
            background: '#5865F2',
          }}
          onMouseEnter={(e) => e.target.style.background = '#4752C4'}
          onMouseLeave={(e) => e.target.style.background = '#5865F2'}
        >
          <MessageCircle size={16} />
          <span>{copied ? 'Copied!' : 'Discord'}</span>
        </button>

        {/* Reddit */}
        <button
          onClick={() => handleShare('reddit')}
          title="Share on Reddit"
          aria-label="Share on Reddit"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 12px',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 500,
            transition: 'all 0.2s ease',
            color: 'white',
            background: '#FF4500',
          }}
          onMouseEnter={(e) => e.target.style.background = '#e63e00'}
          onMouseLeave={(e) => e.target.style.background = '#FF4500'}
        >
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 16,
            height: 16,
            fontWeight: 'bold',
            fontSize: 10,
          }}>R</span>
          <span>Reddit</span>
        </button>
      </div>

      {shareError && (
        <div style={{
          padding: '8px 12px',
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          color: '#c33',
          borderRadius: 4,
          fontSize: 12,
          marginTop: 12,
        }}>
          {shareError}
        </div>
      )}
    </div>
  );
};

export default ShareButtons;
