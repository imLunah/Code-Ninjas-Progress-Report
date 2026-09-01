import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { NINJA_TONES, NINJA_TONE_LABELS, DEFAULT_TONE, ninjaSrc } from '../../utils/ninjas';

// Picks the skin tone of the ninja a family sees at the top of the parent
// portal profile.
//
// The three options are drawn as the real ninja at the ninja's own belt, not
// as swatches. A swatch asks a sensei to imagine the result; three ninjas
// standing side by side IS the result, and the belt is theirs so the only
// thing changing between the three is the thing being chosen.
//
// There is no "clear" option and no null on the way out. A tone is never
// absent on screen — an unset ninja is already being drawn as medium — so a
// button that unset it would look like it did nothing. Medium is simply one of
// the three choices, and it is the one that is preselected.
export default function NinjaTonePickerModal({ isOpen, onClose, student, belt, onSaved }) {
  const [selected, setSelected] = useState(DEFAULT_TONE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelected(student?.ninja_skin_tone || DEFAULT_TONE);
      setError('');
    }
  }, [isOpen, student]);

  const save = async () => {
    setLoading(true);
    setError('');
    try {
      const updated = await api.patch(`/students/${student.id}/ninja-tone`, { ninja_skin_tone: selected });
      onSaved && onSaved(updated.ninja_skin_tone);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save skin tone');
    } finally {
      setLoading(false);
    }
  };

  if (!student) return null;

  const first = student.full_name.split(' ')[0];
  const current = student.ninja_skin_tone || DEFAULT_TONE;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ninja Skin Tone">
      <div className="space-y-4">
        <p className="text-ninja-muted font-ninja text-sm">
          Pick the ninja {first}'s family sees on the Parent Portal.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-ninja-red rounded-lg p-3 text-sm font-ninja">
            {error}
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          {NINJA_TONES.map((tone) => {
            const isSelected = selected === tone;
            return (
              <button
                key={tone}
                type="button"
                onClick={() => setSelected(tone)}
                aria-pressed={isSelected}
                className={`flex flex-col items-center rounded-xl border p-2 transition-colors ${
                  isSelected
                    ? 'border-ninja-blue bg-ninja-blue/10'
                    : 'border-ninja-border bg-ninja-bg hover:border-ninja-blue/40'
                }`}
              >
                {/* The wave, because it is the pose the profile opens on. The
                    box is fixed and the art is contained, so three ninjas of
                    slightly different widths still line up on one baseline. */}
                <img
                  src={ninjaSrc(belt, 'wave', tone)}
                  alt={`${NINJA_TONE_LABELS[tone]} skin tone`}
                  className="h-24 w-full object-contain"
                  draggable={false}
                />
                <span className={`mt-1 font-ninja text-xs font-bold ${isSelected ? 'text-ninja-blue' : 'text-ninja-muted'}`}>
                  {NINJA_TONE_LABELS[tone]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex gap-3 pt-1">
          <Button onClick={save} disabled={loading || selected === current} className="flex-1">
            {loading ? 'Saving...' : 'Save Skin Tone'}
          </Button>
          <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
        </div>
      </div>
    </Modal>
  );
}
