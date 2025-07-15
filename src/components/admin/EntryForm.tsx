'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import type { Tag, ExiconEntry, AnyEntry } from '@/lib/types';

interface EntryFormProps {
  entryToEdit?: AnyEntry;
  onFormSubmit: (data: AnyEntry) => void;
  allTags: Tag[];
}

export function EntryForm({ entryToEdit, onFormSubmit, allTags }: EntryFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [aliases, setAliases] = useState<{ id: string; name: string }[]>([]);
  const [type, setType] = useState<'exicon' | 'lexicon'>('exicon');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [videoLink, setVideoLink] = useState('');

  useEffect(() => {
    if (entryToEdit) {
      setName(entryToEdit.name);
      setDescription(entryToEdit.description);
      setType(entryToEdit.type);
      const isExicon = entryToEdit.type === 'exicon';

      setSelectedTagIds(
        isExicon ? (entryToEdit as ExiconEntry).tags.map((tag) => tag.id) : []
      );
      setVideoLink(isExicon ? (entryToEdit as ExiconEntry).videoLink || '' : '');

      // Safely convert aliases from string[] or { name: string }[] to unified format
      const formattedAliases = Array.isArray(entryToEdit.aliases)
        ? entryToEdit.aliases.map((alias, idx) => ({
            id:
              typeof alias === 'string'
                ? `alias-${Date.now()}-${idx}`
                : alias.id || `alias-${Date.now()}-${idx}`,
            name: typeof alias === 'string' ? alias : alias.name,
          }))
        : [];

      setAliases(formattedAliases);
    } else {
      setName('');
      setDescription('');
      setType('exicon');
      setSelectedTagIds([]);
      setVideoLink('');
      setAliases([]);
    }
  }, [entryToEdit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const commonData = {
      id:
        entryToEdit?.id ||
        `${type}-${Date.now()}-${name.toLowerCase().replace(/\s+/g, '-')}`,
      name,
      description,
      aliases: aliases.filter((alias) => alias.name.trim() !== ''),
    };

    const entryData: AnyEntry =
      type === 'exicon'
        ? {
            ...commonData,
            type: 'exicon',
            tags: selectedTagIds
              .map((id) => allTags.find((tag) => tag.id === id))
              .filter((t): t is Tag => !!t),
            videoLink: videoLink || undefined,
          }
        : {
            ...commonData,
            type: 'lexicon',
          };

    onFormSubmit(entryData);
  };

  const handleAddAlias = () => {
    setAliases((prev) => [
      ...prev,
      { id: `temp-${Date.now()}`, name: '' },
    ]);
  };

  const handleAliasNameChange = (id: string, newName: string) => {
    setAliases((prev) =>
      prev.map((alias) =>
        alias.id === id ? { ...alias, name: newName } : alias
      )
    );
  };

  const handleRemoveAlias = (id: string) => {
    setAliases((prev) => prev.filter((alias) => alias.id !== id));
  };

  const handleTagChange = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  return (
    <Card className="w-full max-w-2xl mx-auto border-0 shadow-none">
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6 pt-0">
          <div className="space-y-2">
            <Label htmlFor="name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">
              Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={5}
            />
          </div>
          <div className="space-y-2">
            <Label>Aliases</Label>
            <div className="space-y-2">
              {aliases.map((alias, idx) => (
                <div key={alias.id} className="flex items-center gap-2">
                  <Input
                    type="text"
                    value={alias.name}
                    onChange={(e) =>
                      handleAliasNameChange(alias.id, e.target.value)
                    }
                    placeholder={`Alias ${idx + 1}`}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleRemoveAlias(alias.id)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleAddAlias}
              className="mt-2"
            >
              + Add Alias
            </Button>
          </div>

          <div className="space-y-2">
            <Label>
              Type <span className="text-destructive">*</span>
            </Label>
            <RadioGroup
              value={type}
              onValueChange={(val) => setType(val as 'exicon' | 'lexicon')}
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem
                  value="exicon"
                  id={`type-exicon-form-${entryToEdit?.id || 'new'}`}
                />
                <Label
                  htmlFor={`type-exicon-form-${entryToEdit?.id || 'new'}`}
                  className="font-normal"
                >
                  Exicon
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem
                  value="lexicon"
                  id={`type-lexicon-form-${entryToEdit?.id || 'new'}`}
                />
                <Label
                  htmlFor={`type-lexicon-form-${entryToEdit?.id || 'new'}`}
                  className="font-normal"
                >
                  Lexicon
                </Label>
              </div>
            </RadioGroup>
          </div>

          {type === 'exicon' && (
            <>
              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-4 border rounded-md max-h-60 overflow-y-auto">
                  {allTags
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((tag) => (
                      <div
                        key={tag.id}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={`tag-form-${tag.id}-${entryToEdit?.id || 'new'}`}
                          checked={selectedTagIds.includes(tag.id)}
                          onCheckedChange={() => handleTagChange(tag.id)}
                        />
                        <Label
                          htmlFor={`tag-form-${tag.id}-${entryToEdit?.id || 'new'}`}
                          className="font-normal"
                        >
                          {tag.name}
                        </Label>
                      </div>
                    ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="videoLink">Video Link (optional)</Label>
                <Input
                  id="videoLink"
                  type="url"
                  value={videoLink}
                  onChange={(e) => setVideoLink(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>
            </>
          )}
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full">
            {entryToEdit ? 'Save Changes' : 'Create Entry'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}