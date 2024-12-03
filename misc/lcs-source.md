---
title: lcs.c
author:
    - Sam Stevens
metatags: [<meta name="robots" content="noindex">, <meta name="googlebot" content="noindex">]
---

Source code for `lcs.c` in [Optimizing Python Code with `ctypes`](/writing/optimizing-python-code-with-ctypes).

This code is licensed under [GNU AGPLv3](/mics/license-gnu)

```c
lcs.c; finds the longest common sequence in a list of strings.
Copyright (C) <2020>  <Samuel Stevens>

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.

#include <stdlib.h>
#include <stdio.h>
#include <string.h>

struct Sequence
{
  char **items;
  int length;
};

struct Cell
{
  int index;
  int length;
  struct Cell *prev;
};

void printSequence(struct Sequence *seq)
{
  printf("%d\n", seq->length);
  for (int i = 0; i < seq->length; i++)
  {
    printf("%s ", seq->items[i]);
  }
  printf("\n");
}

void printCell(struct Cell *cell)
{
  printf("index: %d\t length: %d \tprev: %p\n", cell->index, cell->length, cell->prev);
}

struct Sequence *lcs(struct Sequence *s1, struct Sequence *s2)
{
  struct Sequence *common = malloc(sizeof(struct Sequence));
  common->length = 0;
  common->items = NULL;

  char **seq1 = s1->items;
  char **seq2 = s2->items;

  if (!s1->length || !s2->length)
  {
    return common;
  }

  struct Cell table[s1->length][s2->length];

  for (int i = 0; i < s1->length; i++)
  {
    for (int j = 0; j < s2->length; j++)
    {
      table[i][j].length = 0;
      if (!strcmp(seq1[i], seq2[j]))
      {
        table[i][j].index = j;
        if (i > 0 && j > 0)
        {
          table[i][j].prev = &table[i - 1][j - 1];
          table[i][j].length = table[i - 1][j - 1].length + 1;
        }
        else
        {
          table[i][j].prev = NULL;
          table[i][j].length = 1;
        }
      }
      else
      {
        table[i][j].index = -1;
        table[i][j].prev = NULL;
        if (i > 0)
        {
          table[i][j].prev = &table[i - 1][j];
          table[i][j].length = table[i - 1][j].length;
        }

        if (j > 0)
        {
          if (table[i][j - 1].length > table[i][j].length)
          {
            table[i][j].prev = &table[i][j - 1];
            table[i][j].length = table[i][j - 1].length;
          }
        }
      }
    }
  }

  int i = s1->length - 1;
  int j = s2->length - 1;
  struct Cell *cur = &table[i][j];

  common->length = cur->length;
  common->items = malloc(sizeof(char *) * common->length);

  i = cur->length - 1;

  while (cur)
  {
    if (cur->index < 0)
    {
      cur = cur->prev;
      continue;
    }

    common->items[i] = malloc(
      sizeof(char) *
      (strlen(seq2[cur->index]) + 1));

    strcpy(common->items[i], seq2[cur->index]);
    cur = cur->prev;
    i--;
  }
  return common;
}

void freeSequence(struct Sequence *seq)
{
  free(seq);
}

/*
Must be called like so:
./lcs <length 1> <length 2> <sequence> <of> <words1> <sequence2> 
*/
int main(int argc, char **argv)
{
  if (argc < 3)
  {
    printf("You must provide at least 3 arguments.\n");
    return -1;
  }

  int len1 = atoi(argv[1]);
  int len2 = atoi(argv[2]);

  if (argc < 3 + len1 + len2)
  {
    printf("Sequence lengths must be valid.\n");
    return -1;
  }

  char **s1 = &argv[3];
  char **s2 = &argv[3 + len1];

  struct Sequence seq1;
  seq1.items = s1;
  seq1.length = len1;

  struct Sequence seq2;
  seq2.items = s2;
  seq2.length = len2;

  struct Sequence *common = lcs(&seq1, &seq2);

  printSequence(common);
}
```