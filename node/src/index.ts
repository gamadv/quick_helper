import { startParseInvestiments } from './investmentsParser/parser'

const teste = [
  {
    nome: 'videoIndex',
    valor: 'https://www.youtube.com/watch?v=EzsI3zWA8pE',
  },
  {
    nome: 'qtdAulas',
    valor: '400',
  },
  {
    nome: 'qtdSerie',
    valor: '60',
  },
  {
    nome: 'qtdProfessor',
    valor: '40',
  },
]

const toConsole = teste.filter((param) => param.nome !== 'videoIndex')

console.log('🚀 ~ file: index.ts:531 ~ toConsole:', toConsole)
