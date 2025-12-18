'use client';

import { useEffect, useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { isProxyEnabled, setProxyEnabled } from '@/lib/openai';
import { Cloud, Key } from 'lucide-react';

/**
 * Toggle switch for proxy mode vs direct API key mode.
 * - Proxy: uses server-side API key (no key needed from user)
 * - Direct: uses client-side API key from localStorage
 */
export function ProxyToggle() {
  const [useProxy, setUseProxy] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setUseProxy(isProxyEnabled());
  }, []);

  const handleToggle = (checked: boolean) => {
    setUseProxy(checked);
    setProxyEnabled(checked);
    // Reload to apply new configuration
    window.location.reload();
  };

  // Avoid hydration mismatch
  if (!mounted) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Key size={16} className={useProxy ? 'opacity-40' : 'opacity-100'} />
      <Switch
        checked={useProxy}
        onCheckedChange={handleToggle}
        aria-label="Toggle proxy mode"
      />
      <Cloud size={16} className={useProxy ? 'opacity-100' : 'opacity-40'} />
      <Label className="text-xs hidden xl:inline">
        {useProxy ? 'Proxy' : 'API Key'}
      </Label>
    </div>
  );
}
