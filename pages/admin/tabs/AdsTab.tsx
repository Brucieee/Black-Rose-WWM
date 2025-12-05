
import React, { useState, useEffect } from 'react';
import { db } from '../../../services/firebase';
import { useAlert } from '../../../contexts/AlertContext';
import { AdConfig } from '../../../types';
import { ImageUpload } from '../../../components/ImageUpload';
import { Save, Plus, Trash2, Power } from 'lucide-react';

export const AdsTab: React.FC = () => {
  const { showAlert } = useAlert();
  const [config, setConfig] = useState<AdConfig>({
    isActive: false,
    title: '',
    description: '',
    images: [],
    passphrase: '',
    intervalMinutes: 30
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = db.collection('system').doc('adConfig').onSnapshot(doc => {
      if (doc.exists) {
        setConfig(doc.data() as AdConfig);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSave = async () => {
    try {
      await db.collection('system').doc('adConfig').set(config);
      showAlert('Ad System configuration saved.', 'success');
    } catch (err: any) {
      showAlert(err.message, 'error');
    }
  };

  const handleAddImage = (url: string) => {
    if (!url) return;
    setConfig(prev => ({ ...prev, images: [...prev.images, url] }));
  };

  const handleRemoveImage = (index: number) => {
    const newImages = [...config.images];
    newImages.splice(index, 1);
    setConfig(prev => ({ ...prev, images: newImages }));
  };

  if (loading) return <div className="text-center p-8">Loading configuration...</div>;

  return (
    <div className="max-w-4xl">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Global Ad System</h2>
            <div className="flex items-center gap-3">
                <span className={`text-sm font-bold ${config.isActive ? 'text-green-500' : 'text-zinc-500'}`}>
                    {config.isActive ? 'SYSTEM ACTIVE' : 'SYSTEM DISABLED'}
                </span>
                <button 
                    onClick={() => setConfig(prev => ({...prev, isActive: !prev.isActive}))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.isActive ? 'bg-green-500' : 'bg-zinc-600'}`}
                >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <h3 className="text-lg font-bold mb-4 text-zinc-900 dark:text-zinc-100">Content</h3>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Popup Title</label>
                            <input 
                                className="w-full p-2 border rounded bg-white dark:bg-zinc-800 dark:border-zinc-700 text-zinc-900 dark:text-white"
                                value={config.title}
                                onChange={e => setConfig({...config, title: e.target.value})}
                                placeholder="e.g. Important Announcement"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Description</label>
                            <textarea 
                                className="w-full p-2 border rounded bg-white dark:bg-zinc-800 dark:border-zinc-700 text-zinc-900 dark:text-white h-32"
                                value={config.description}
                                onChange={e => setConfig({...config, description: e.target.value})}
                                placeholder="Message body..."
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <h3 className="text-lg font-bold mb-4 text-zinc-900 dark:text-zinc-100">Settings</h3>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Passphrase (Required to close)</label>
                            <input 
                                className="w-full p-2 border rounded bg-white dark:bg-zinc-800 dark:border-zinc-700 text-zinc-900 dark:text-white font-mono text-rose-600 dark:text-rose-400"
                                value={config.passphrase}
                                onChange={e => setConfig({...config, passphrase: e.target.value})}
                                placeholder="e.g. I love Black Rose"
                            />
                            <p className="text-xs text-zinc-500 mt-1">Users must type this exactly to close the popup.</p>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Frequency (Minutes)</label>
                            <input 
                                type="number"
                                className="w-full p-2 border rounded bg-white dark:bg-zinc-800 dark:border-zinc-700 text-zinc-900 dark:text-white"
                                value={config.intervalMinutes}
                                onChange={e => setConfig({...config, intervalMinutes: parseInt(e.target.value) || 30})}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <h3 className="text-lg font-bold mb-4 text-zinc-900 dark:text-zinc-100">Image Gallery</h3>
                
                <div className="mb-6">
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Upload New Image</label>
                    <ImageUpload 
                        folder="ads" 
                        onUploadComplete={handleAddImage}
                        initialUrl=""
                    />
                </div>

                <div className="space-y-2">
                    <label className="block text-xs font-bold text-zinc-500 uppercase">Active Images ({config.images.length})</label>
                    <div className="grid grid-cols-2 gap-4 max-h-[400px] overflow-y-auto custom-scrollbar p-1">
                        {config.images.map((url, idx) => (
                            <div key={idx} className="relative group rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 aspect-video">
                                <img src={url} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <button 
                                        onClick={() => handleRemoveImage(idx)}
                                        className="bg-red-600 text-white p-2 rounded-full hover:bg-red-700 transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                <div className="absolute top-1 left-1 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded">
                                    #{idx + 1}
                                </div>
                            </div>
                        ))}
                        {config.images.length === 0 && (
                            <div className="col-span-2 text-center py-8 text-zinc-500 italic border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg">
                                No images uploaded.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>

        <div className="mt-6 flex justify-end">
            <button 
                onClick={handleSave}
                className="bg-rose-900 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-rose-900/20 hover:bg-rose-950 transition-colors flex items-center gap-2"
            >
                <Save size={18} /> Save Configuration
            </button>
        </div>
    </div>
  );
};
