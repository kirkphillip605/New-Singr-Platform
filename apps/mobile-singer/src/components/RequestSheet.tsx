import { useState, useEffect } from 'react';
import {
  Sheet,
  Preloader,
  Segmented,
  Button,
  Stepper,
  f7,
  useStore,
} from 'framework7-react';
import { submitRequest } from '../lib/api';
import store from '../lib/store';
import { SongItem } from './SongList';

interface RequestSheetProps {
  opened: boolean;
  song: SongItem | null;
  onClose: () => void;
}

function buildSingerName(perfType: string, soloName: string, duetNames: string[], groupMembers: string[]) {
  if (perfType === 'solo') {
    return soloName.trim();
  }
  if (perfType === 'duet') {
    const a = (duetNames[0] || '').trim();
    const b = (duetNames[1] || '').trim();
    if (a && b) return `${a} & ${b}`;
    return a || b;
  }
  if (perfType === 'group') {
    const names = groupMembers.map((n) => (n || '').trim()).filter(Boolean);
    if (names.length === 0) return '';
    if (names.length === 1) return names[0] || '';
    if (names.length === 2) return `${names[0]} & ${names[1]}`;
    return names.slice(0, -1).join(', ') + ', & ' + (names[names.length - 1] || '');
  }
  return '';
}

export default function RequestSheet({ opened, song, onClose }: RequestSheetProps) {
  const checkedInVenue = useStore('checkedInVenue') as any;
  const savedSingerName = useStore('singerName') as string | undefined;

  const [perfType, setPerfType] = useState('solo');
  const [soloName, setSoloName] = useState('');
  const [duetNames, setDuetNames] = useState(['', '']);
  const [groupMembers, setGroupMembers] = useState(['']);
  const [keyChange, setKeyChange] = useState(0);
  const [loading, setLoading] = useState(false);

  // Reset states when the sheet is opened
  useEffect(() => {
    if (opened) {
      setPerfType('solo');
      setSoloName(savedSingerName || '');
      setDuetNames([savedSingerName || '', '']);
      setGroupMembers([savedSingerName || '']);
      setKeyChange(0);
      setLoading(false);
    }
  }, [opened, savedSingerName]);

  // Handle auto-closing listeners when routing shifts
  useEffect(() => {
    if (!opened) return;

    const handleClose = () => {
      onClose();
    };

    if (f7) {
      f7.on('routeChange', handleClose);
      f7.on('tabShow', handleClose);
      f7.on('popupOpen', handleClose);
    }

    return () => {
      if (f7) {
        f7.off('routeChange', handleClose);
        f7.off('tabShow', handleClose);
        f7.off('popupOpen', handleClose);
      }
    };
  }, [opened, onClose]);

  const singerName = buildSingerName(perfType, soloName, duetNames, groupMembers);
  const canSubmit = singerName.length > 0 && !loading && checkedInVenue?.id && song;

  const handleSubmit = async () => {
    if (!canSubmit || !song || !checkedInVenue?.id) return;

    const nameToSave = (
      perfType === 'solo'
        ? soloName
        : perfType === 'duet'
        ? (duetNames[0] || '')
        : (groupMembers[0] || '')
    ).trim();

    const songId = song.songId;
    const showId = checkedInVenue.id;
    const songTitle = song.title;
    const songArtist = song.artist;

    const doSubmit = async () => {
      setLoading(true);
      try {
        const result = await submitRequest(showId, songId, singerName, keyChange);

        if (result.success) {
          // Save request to local history in storage
          const historySaved = localStorage.getItem('singr_request_history');
          let historyItems = [];
          if (historySaved) {
            try {
              historyItems = JSON.parse(historySaved);
            } catch {
              historyItems = [];
            }
          }
          const record = {
            id: `req-${Date.now()}`,
            songTitle,
            songArtist,
            venueName: checkedInVenue.name,
            submittedAt: new Date().toISOString(),
            keyChange,
          };
          localStorage.setItem('singr_request_history', JSON.stringify([record, ...historyItems]));
          // Dispatch storage event to alert UI
          window.dispatchEvent(new Event('storage'));

          onClose(); // Close sheet on success
          f7.toast.create({
            text: `Request for "${songTitle}" submitted! 🎤`,
            position: 'bottom',
            closeTimeout: 2000,
          } as any).open();
        } else {
          f7.toast.create({
            text: result.error || 'Request failed. Please try again.',
            position: 'bottom',
            closeTimeout: 2000,
          } as any).open();
        }
      } catch (err: any) {
        console.error('Submit failed:', err);
        f7.toast.create({
          text: err.message || 'Network error. Please try again.',
          position: 'bottom',
          closeTimeout: 2000,
        } as any).open();
      } finally {
        setLoading(false);
      }
    };

    const neverPrompt = localStorage.getItem('vibe_never_prompt_name') === 'true';

    if (!savedSingerName && !neverPrompt && nameToSave) {
      f7.dialog.create({
        title: 'Save Singer Name?',
        text: `Would you like to save "${nameToSave}" as your default singer name for future requests?`,
        content: `
          <div class="dialog-checkbox-wrapper" style="margin-top: 12px; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 13px; color: rgba(255, 255, 255, 0.75);">
            <input type="checkbox" id="never-ask-checkbox" style="width: 16px; height: 16px; accent-color: var(--vibe-accent);" />
            <label for="never-ask-checkbox" style="cursor: pointer; user-select: none;">Remember my choice and never ask again</label>
          </div>
        `,
        buttons: [
          {
            text: 'No',
            onClick: () => {
              const checked = (document.getElementById('never-ask-checkbox') as HTMLInputElement)?.checked;
              if (checked) {
                localStorage.setItem('vibe_never_prompt_name', 'true');
                localStorage.setItem('vibe_should_save_name', 'false');
              }
              doSubmit();
            }
          },
          {
            text: 'Yes',
            onClick: () => {
              const checked = (document.getElementById('never-ask-checkbox') as HTMLInputElement)?.checked;
              if (checked) {
                localStorage.setItem('vibe_never_prompt_name', 'true');
                localStorage.setItem('vibe_should_save_name', 'true');
              }
              store.dispatch('setSingerName', nameToSave);
              doSubmit();
            }
          } as any
        ]
      }).open();
    } else {
      if (!savedSingerName && neverPrompt && localStorage.getItem('vibe_should_save_name') === 'true' && nameToSave) {
        store.dispatch('setSingerName', nameToSave);
      }
      doSubmit();
    }
  };

  const updateDuet = (idx: number, val: string) => {
    const next = [...duetNames];
    next[idx] = val;
    setDuetNames(next);
  };

  const updateMember = (idx: number, val: string) => {
    const next = [...groupMembers];
    next[idx] = val;
    setGroupMembers(next);
  };

  const addMember = () => {
    if (groupMembers.length < 4) {
      setGroupMembers([...groupMembers, '']);
    }
  };

  const removeMember = (idx: number) => {
    if (groupMembers.length <= 1) return;
    setGroupMembers(groupMembers.filter((_, i) => i !== idx));
  };

  return (
    <Sheet
      className="request-sheet"
      opened={opened}
      onSheetClosed={onClose}
      backdrop
      closeByBackdropClick
      closeByOutsideClick
      swipeToClose
      push
      style={{ height: 'auto', maxHeight: '90vh' }}
    >
      <div className="sheet-handle">
        <div className="sheet-handle-bar" />
      </div>

      <div className="request-sheet-header">
        <div className="request-sheet-title">{song ? song.title : ''}</div>
        <div className="request-sheet-subtitle">{song ? song.artist : ''}</div>
      </div>

      <div className="request-sheet-body">
        {/* Performance Type Selector */}
        <div className="perf-segmented-wrap">
          <Segmented raised className="perf-type-segmented">
            <Button
              active={perfType === 'solo'}
              onClick={() => setPerfType('solo')}
            >
              <i className="f7-icons">person_fill</i>
              <span>Solo</span>
            </Button>
            <Button
              active={perfType === 'duet'}
              onClick={() => setPerfType('duet')}
            >
              <i className="f7-icons">person_2_fill</i>
              <span>Duet</span>
            </Button>
            <Button
              active={perfType === 'group'}
              onClick={() => setPerfType('group')}
            >
              <i className="f7-icons">person_3_fill</i>
              <span>Group</span>
            </Button>
          </Segmented>
        </div>

        {/* Singer Name Inputs */}
        <div className="singer-inputs-container">
          {perfType === 'solo' && (
            <input
              className="form-input"
              type="text"
              placeholder="Your name"
              value={soloName}
              onChange={(e) => setSoloName(e.target.value)}
              autoComplete="off"
            />
          )}

          {perfType === 'duet' && (
            <div className="duet-inputs-wrapper">
              <input
                className="form-input duet-input"
                type="text"
                placeholder="Singer 1"
                value={duetNames[0]}
                onChange={(e) => updateDuet(0, e.target.value)}
                autoComplete="off"
              />
              <span className="duet-amp-inline">&</span>
              <input
                className="form-input duet-input"
                type="text"
                placeholder="Singer 2"
                value={duetNames[1]}
                onChange={(e) => updateDuet(1, e.target.value)}
                autoComplete="off"
              />
            </div>
          )}

          {perfType === 'group' && (
            <div className="group-inputs-list">
              {groupMembers.map((member, idx) => (
                <div key={idx} className="group-member-row">
                  <input
                    className="form-input group-member-input"
                    type="text"
                    placeholder={idx === 0 ? "Group Name (e.g. The Karaoke Crew)" : `Member ${idx + 1}`}
                    value={member}
                    onChange={(e) => updateMember(idx, e.target.value)}
                    autoComplete="off"
                  />
                  {idx > 0 ? (
                    <button
                      type="button"
                      className="group-member-remove-btn"
                      onClick={() => removeMember(idx)}
                    >
                      <i className="f7-icons">xmark_circle_fill</i>
                    </button>
                  ) : (
                    <div className="group-member-remove-spacer" />
                  )}
                </div>
              ))}
              {groupMembers.length < 4 && (
                <button
                  type="button"
                  className="group-member-add-btn"
                  onClick={addMember}
                >
                  <i className="f7-icons">plus_circle_fill</i>
                  <span>Add Member ({groupMembers.length}/4)</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Stepper + Submit — side by side */}
        <div className="request-footer-row">
          <div className="key-change-stepper-control">
            <span className="key-change-label">Key:</span>
            <Stepper
              min={-6}
              max={6}
              value={keyChange}
              onStepperChange={setKeyChange}
              fill
              small
              raised
            />
          </div>

          <button
            className="submit-request-btn"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {loading ? (
              <Preloader size={20} color="white" />
            ) : (
              <>
                <i className="f7-icons">paperplane_fill</i>
                <span>Submit</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Sheet>
  );
}
