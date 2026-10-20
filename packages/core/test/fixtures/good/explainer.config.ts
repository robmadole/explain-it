import {defineExplainer, defineTheme} from '@explain-it/core/config';

export default defineExplainer({
  title: 'Good',
  theme: defineTheme({creator: '#f2b84b'}),
  legend: [{color: 'creator', label: 'Creator'}],
  sections: [{id: 'one', label: 'One'}],
});
