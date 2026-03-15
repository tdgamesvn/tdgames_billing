import React, { useState, useEffect } from 'react';
import * as clickup from '../services/clickupService';
import { ClickUpConfig as ConfigType, ClickUpSpace, ClickUpList } from '../services/clickupService';

interface ClickUpConfigProps {
  onToast: (msg: string, type: 'success' | 'error') => void;
}

const inputCls = "w-full bg-transparent border border-primary/10 rounded-xl px-4 py-3 text-white placeholder-neutral-medium/40 focus:outline-none focus:border-primary/40 transition-all text-sm";
const labelCls = "text-[10px] font-black uppercase tracking-widest text-neutral-medium mb-2 block";
const btnPrimary = "py-3 px-6 rounded-xl font-black text-xs uppercase tracking-widest bg-gradient-primary text-white shadow-btn-glow hover:shadow-btn-glow-hover transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed";
const btnSecondary = "py-3 px-6 rounded-xl font-black text-xs uppercase tracking-widest border border-primary/10 text-neutral-medium hover:text-white hover:border-primary/30 transition-all";

type Step = 'token' | 'team' | 'spaces' | 'done';

const ClickUpConfigComponent: React.FC<ClickUpConfigProps> = ({ onToast }) => {
  const [config, setConfig] = useState<ConfigType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [step, setStep] = useState<Step>('token');
  const [saving, setSaving] = useState(false);

  // Form state
  const [token, setToken] = useState('');
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedTeamName, setSelectedTeamName] = useState('');
  const [spaces, setSpaces] = useState<{ id: string; name: string }[]>([]);
  const [configSpaces, setConfigSpaces] = useState<ClickUpSpace[]>([]);
  const [loadingStep, setLoadingStep] = useState(false);
  const [loadingSpaceId, setLoadingSpaceId] = useState<string | null>(null);

  // Load existing config
  useEffect(() => {
    (async () => {
      try {
        const c = await clickup.loadConfig();
        if (c) {
          setConfig(c);
          setToken(c.api_token);
          setSelectedTeamId(c.team_id);
          setSelectedTeamName(c.team_name);
          setConfigSpaces(c.spaces || []);
          setStep('done');
        }
      } catch (e: any) {
        onToast(e.message, 'error');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // ── Step 1: Validate token → get teams ──
  const handleTokenSubmit = async () => {
    if (!token.trim()) return;
    setLoadingStep(true);
    try {
      const data = await clickup.fetchTeams(token.trim());
      setTeams(data.teams || []);
      if (data.teams.length === 1) {
        setSelectedTeamId(data.teams[0].id);
        setSelectedTeamName(data.teams[0].name);
      }
      setStep('team');
      onToast('Kết nối ClickUp thành công!', 'success');
    } catch (e: any) {
      onToast(`Lỗi: ${e.message}`, 'error');
    } finally {
      setLoadingStep(false);
    }
  };

  // ── Step 2: Select team → auto-load ALL spaces + lists ──
  const handleTeamSelect = async () => {
    if (!selectedTeamId) return;
    setLoadingStep(true);
    try {
      // 1. Fetch all spaces
      const data = await clickup.fetchSpaces(token, selectedTeamId);
      const allSpaces = data.spaces || [];
      setSpaces(allSpaces);

      // 2. Auto-load lists for ALL spaces
      const loadedSpaces: ClickUpSpace[] = [];
      for (const sp of allSpaces) {
        try {
          const listData = await clickup.fetchLists(token, sp.id);
          const lists: ClickUpList[] = (listData.lists || []).map((l: any) => ({
            id: l.id, name: l.name, folder: l.folder, selected: true, // Auto-select all
          }));
          loadedSpaces.push({ id: sp.id, name: sp.name, lists });
        } catch {
          loadedSpaces.push({ id: sp.id, name: sp.name, lists: [] });
        }
      }
      setConfigSpaces(loadedSpaces);
      setStep('spaces');
      onToast(`Đã load ${allSpaces.length} spaces với tất cả lists`, 'success');
    } catch (e: any) {
      onToast(`Lỗi: ${e.message}`, 'error');
    } finally {
      setLoadingStep(false);
    }
  };

  // ── Refresh lists for a single space ──
  const handleRefreshSpace = async (spaceId: string, spaceName: string) => {
    setLoadingSpaceId(spaceId);
    try {
      const data = await clickup.fetchLists(token, spaceId);
      const lists: ClickUpList[] = (data.lists || []).map((l: any) => ({
        id: l.id, name: l.name, folder: l.folder, selected: true,
      }));
      setConfigSpaces(prev => {
        const existing = prev.find(s => s.id === spaceId);
        if (existing) {
          return prev.map(s => s.id === spaceId ? { ...s, lists } : s);
        }
        return [...prev, { id: spaceId, name: spaceName, lists }];
      });
    } catch (e: any) {
      onToast(`Lỗi: ${e.message}`, 'error');
    } finally {
      setLoadingSpaceId(null);
    }
  };

  // ── Toggle helpers ──
  const toggleList = (spaceId: string, listId: string) => {
    setConfigSpaces(prev => prev.map(s =>
      s.id === spaceId
        ? { ...s, lists: s.lists.map(l => l.id === listId ? { ...l, selected: !l.selected } : l) }
        : s
    ));
  };

  const toggleAllListsInSpace = (spaceId: string) => {
    setConfigSpaces(prev => prev.map(s => {
      if (s.id !== spaceId) return s;
      const allSelected = s.lists.every(l => l.selected);
      return { ...s, lists: s.lists.map(l => ({ ...l, selected: !allSelected })) };
    }));
  };

  const toggleAllSpaces = () => {
    const allSelected = configSpaces.every(s => s.lists.every(l => l.selected));
    setConfigSpaces(prev => prev.map(s => ({
      ...s, lists: s.lists.map(l => ({ ...l, selected: !allSelected }))
    })));
  };

  // ── Save config ──
  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await clickup.saveConfig({
        api_token: token,
        team_id: selectedTeamId,
        team_name: selectedTeamName,
        spaces: configSpaces,
        last_synced: config?.last_synced || null,
      });
      setConfig(saved);
      setStep('done');
      onToast('Đã lưu cấu hình ClickUp!', 'success');
    } catch (e: any) {
      onToast(`Lỗi: ${e.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const selectedListCount = configSpaces.reduce((s, sp) => s + sp.lists.filter(l => l.selected).length, 0);
  const totalListCount = configSpaces.reduce((s, sp) => s + sp.lists.length, 0);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-fadeInUp space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-4xl font-black text-primary uppercase tracking-tighter">ClickUp Config</h2>
        <p className="text-neutral-medium text-sm mt-1">Kết nối ClickUp để đồng bộ task cho nhân sự</p>
      </div>

      {/* Connected Status */}
      {step === 'done' && config && (
        <div className="rounded-[20px] border border-emerald-500/20 bg-surface p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400 font-black text-sm uppercase tracking-widest">Đã kết nối</span>
            </div>
            <button onClick={() => setStep('token')} className={btnSecondary}>
              ⚙️ Cấu hình lại
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-primary/10">
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-medium mb-1">Team</p>
              <p className="text-white font-bold">{config.team_name}</p>
            </div>
            <div className="p-4 rounded-xl border border-primary/10">
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-medium mb-1">Spaces</p>
              <p className="text-white font-bold">{config.spaces?.length || 0}</p>
            </div>
            <div className="p-4 rounded-xl border border-primary/10">
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-medium mb-1">Lists đã chọn</p>
              <p className="text-white font-bold">{config.spaces?.reduce((s: number, sp: ClickUpSpace) => s + sp.lists.filter((l: ClickUpList) => l.selected).length, 0) || 0}</p>
            </div>
          </div>
          {config.last_synced && (
            <p className="text-neutral-medium text-xs">
              🔄 Sync lần cuối: {new Date(config.last_synced).toLocaleString('vi-VN')}
            </p>
          )}

          {/* Selected Lists Detail */}
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-medium">Lists được sync:</p>
            {config.spaces?.map((sp: ClickUpSpace) => {
              const selected = sp.lists.filter((l: ClickUpList) => l.selected);
              if (selected.length === 0) return null;
              return (
                <div key={sp.id} className="flex flex-wrap gap-2 items-center">
                  <span className="text-xs text-neutral-medium/60">{sp.name}:</span>
                  {selected.map((l: ClickUpList) => (
                    <span key={l.id} className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary">{l.name}</span>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Realtime Sync Toggle */}
          <div className="border-t border-primary/10 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-medium mb-1">⚡ Realtime Sync</p>
                <p className="text-neutral-medium/60 text-[11px]">Tự động cập nhật task khi có thay đổi trên ClickUp</p>
              </div>
              <button
                onClick={async () => {
                  try {
                    if ((config as any).webhook_id) {
                      // Disable: delete webhook
                      await clickup.deleteWebhook(config.api_token, (config as any).webhook_id);
                      await clickup.saveWebhookId(null);
                      setConfig({ ...config, webhook_id: null } as any);
                      onToast('Đã tắt Realtime Sync', 'success');
                    } else {
                      // Enable: register webhook
                      const wh = await clickup.registerWebhook(config.api_token, config.team_id);
                      await clickup.saveWebhookId(wh.id);
                      setConfig({ ...config, webhook_id: wh.id } as any);
                      onToast('Đã bật Realtime Sync!', 'success');
                    }
                  } catch (e: any) {
                    onToast(`Lỗi: ${e.message}`, 'error');
                  }
                }}
                className={`relative w-14 h-7 rounded-full transition-all ${
                  (config as any).webhook_id ? 'bg-emerald-500' : 'bg-neutral-dark/50'
                }`}
              >
                <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all ${
                  (config as any).webhook_id ? 'left-7' : 'left-0.5'
                }`} />
              </button>
            </div>
            {(config as any).webhook_id && (
              <div className="flex items-center gap-2 text-xs text-emerald-400">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Đang lắng nghe thay đổi từ ClickUp
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 1: API Token */}
      {(step === 'token' || step === 'team') && (
        <div className="rounded-[20px] border border-primary/10 bg-surface p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-black text-sm">1</div>
            <h3 className="text-white font-bold">API Token</h3>
          </div>
          <div>
            <label className={labelCls}>ClickUp Personal API Token</label>
            <input
              type="password"
              className={inputCls}
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="pk_xxxxxxxxxxxx"
            />
            <p className="text-neutral-medium/50 text-[11px] mt-2">Lấy tại: ClickUp → Avatar góc dưới trái → Settings → Apps → API Token</p>
          </div>
          {step === 'token' && (
            <button onClick={handleTokenSubmit} disabled={loadingStep || !token.trim()} className={btnPrimary}>
              {loadingStep ? '⏳ Đang kết nối...' : '🔗 Kết nối'}
            </button>
          )}
        </div>
      )}

      {/* Step 2: Select Team */}
      {(step === 'team' || step === 'spaces') && teams.length > 0 && (
        <div className="rounded-[20px] border border-primary/10 bg-surface p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-black text-sm">2</div>
            <h3 className="text-white font-bold">Chọn Workspace</h3>
          </div>
          <div className="space-y-2">
            {teams.map(t => (
              <label key={t.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                selectedTeamId === t.id ? 'border-primary/40 bg-primary/5' : 'border-primary/10 hover:border-primary/20'
              }`}>
                <input type="radio" name="team" checked={selectedTeamId === t.id} onChange={() => { setSelectedTeamId(t.id); setSelectedTeamName(t.name); }} className="accent-primary" />
                <span className="text-white font-medium">{t.name}</span>
                <span className="text-neutral-medium text-xs">ID: {t.id}</span>
              </label>
            ))}
          </div>
          {step === 'team' && (
            <button onClick={handleTeamSelect} disabled={loadingStep || !selectedTeamId} className={btnPrimary}>
              {loadingStep ? '⏳ Đang load tất cả Spaces & Lists...' : 'Load Workspace →'}
            </button>
          )}
        </div>
      )}

      {/* Step 3: Select Spaces & Lists — auto-loaded, multi-select */}
      {step === 'spaces' && configSpaces.length > 0 && (
        <div className="rounded-[20px] border border-primary/10 bg-surface p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-black text-sm">3</div>
              <h3 className="text-white font-bold">Chọn Spaces & Lists để sync</h3>
            </div>
            <button onClick={toggleAllSpaces} className="text-xs text-primary hover:text-primary-dark font-bold transition-colors">
              {configSpaces.every(s => s.lists.every(l => l.selected))
                ? '☐ Bỏ chọn tất cả'
                : '☑ Chọn toàn bộ Workspace'}
            </button>
          </div>

          <p className="text-neutral-medium text-xs">
            Đã load <span className="text-white font-bold">{configSpaces.length}</span> spaces, <span className="text-white font-bold">{totalListCount}</span> lists — đã chọn <span className="text-primary font-bold">{selectedListCount}</span>
          </p>

          {configSpaces.map(sp => {
            const allSelected = sp.lists.length > 0 && sp.lists.every(l => l.selected);
            const someSelected = sp.lists.some(l => l.selected);
            return (
              <div key={sp.id} className={`rounded-xl border p-4 space-y-3 transition-all ${
                someSelected ? 'border-primary/30 bg-primary/3' : 'border-primary/10'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleAllListsInSpace(sp.id)}
                      className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold transition-all ${
                        allSelected ? 'bg-primary text-black' : someSelected ? 'bg-primary/30 text-primary' : 'border border-primary/20 text-neutral-medium'
                      }`}
                    >
                      {allSelected ? '✓' : someSelected ? '−' : ''}
                    </button>
                    <span className="text-white font-bold">{sp.name}</span>
                    <span className="text-neutral-medium text-[10px]">
                      {sp.lists.filter(l => l.selected).length}/{sp.lists.length} lists
                    </span>
                  </div>
                  <button
                    onClick={() => handleRefreshSpace(sp.id, sp.name)}
                    disabled={loadingSpaceId === sp.id}
                    className="text-[10px] text-neutral-medium hover:text-primary font-bold transition-colors"
                  >
                    {loadingSpaceId === sp.id ? '⏳' : '🔄'}
                  </button>
                </div>

                {sp.lists.length > 0 && (
                  <div className="space-y-1 ml-8">
                    {sp.lists.map(l => (
                      <label key={l.id} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                        l.selected ? 'bg-primary/8' : 'hover:bg-white/3'
                      }`}>
                        <input
                          type="checkbox"
                          checked={l.selected}
                          onChange={() => toggleList(sp.id, l.id)}
                          className="accent-primary w-4 h-4"
                        />
                        <span className={`text-sm ${l.selected ? 'text-white font-medium' : 'text-neutral-medium'}`}>{l.name}</span>
                        {l.folder && <span className="text-[10px] text-neutral-medium/40 ml-auto">📁 {l.folder}</span>}
                      </label>
                    ))}
                  </div>
                )}
                {sp.lists.length === 0 && (
                  <p className="text-neutral-medium/50 text-xs ml-8">Không có list nào</p>
                )}
              </div>
            );
          })}

          <div className="flex items-center justify-between pt-3 border-t border-primary/10">
            <p className="text-neutral-medium text-xs">{selectedListCount}/{totalListCount} lists đã chọn</p>
            <button onClick={handleSave} disabled={saving || selectedListCount === 0} className={btnPrimary}>
              {saving ? '⏳ Đang lưu...' : '💾 Lưu cấu hình'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClickUpConfigComponent;
