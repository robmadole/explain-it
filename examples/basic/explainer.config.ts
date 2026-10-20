import {defineExplainer} from '@explain-it/core/config';

import {theme} from './theme';

export default defineExplainer({
  title: 'A request',
  theme,
  legendTitle: 'RUNS ON',
  legend: [
    {color: 'client', label: 'Browser'},
    {color: 'accent', label: 'Server'},
  ],
  sections: [
    {id: 'request', label: 'Request'},
    {id: 'response', label: 'Response'},
  ],
});
