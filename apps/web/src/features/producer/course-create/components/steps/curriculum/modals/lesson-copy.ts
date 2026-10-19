import type { LessonFormData } from '../types'

export type LessonType = LessonFormData['type']

export type LessonModalCopy = {
  createTitle: string
  editTitle: string
  createDescription: string
  editDescription: string
  createSubmit: string
}

export type LessonFieldCopy = {
  titlePlaceholder: string
  descriptionPlaceholder: string
  durationLabel: string
  durationPlaceholder: string
  durationHelp: string
  previewTitle: string
  previewDescription: string
}

export const LESSON_FIELD_COPY: Record<LessonType, LessonFieldCopy> = {
  video: {
    titlePlaceholder: 'Ex: Aula 1 - Introdução ao tema',
    descriptionPlaceholder: 'Resuma o que o aluno aprenderá neste vídeo',
    durationLabel: 'Duração estimada da aula (minutos)',
    durationPlaceholder: 'Ex: 12',
    durationHelp: 'Tempo aproximado para o aluno concluir esta aula.',
    previewTitle: 'Aula de Preview Gratuito',
    previewDescription: 'Permitir que não-inscritos assistam este vídeo.',
  },
  text: {
    titlePlaceholder: 'Ex: Leitura guiada - Conceitos principais',
    descriptionPlaceholder: 'Explique o objetivo desta leitura para o aluno',
    durationLabel: 'Tempo estimado de leitura (minutos)',
    durationPlaceholder: 'Ex: 8',
    durationHelp: 'Tempo médio para leitura completa do conteúdo.',
    previewTitle: 'Leitura de Preview Gratuito',
    previewDescription: 'Permitir que não-inscritos leiam este conteúdo.',
  },
  file: {
    titlePlaceholder: 'Ex: Material de apoio - Aula 2',
    descriptionPlaceholder: 'Descreva como o aluno deve usar este arquivo',
    durationLabel: 'Tempo estimado de estudo (minutos)',
    durationPlaceholder: 'Ex: 20',
    durationHelp: 'Tempo médio para estudar este material.',
    previewTitle: 'Arquivo de Preview Gratuito',
    previewDescription: 'Permitir acesso ao arquivo para não-inscritos.',
  },
  quiz: {
    titlePlaceholder: 'Ex: Avaliação da Unidade 1',
    descriptionPlaceholder: 'Explique o objetivo desta avaliação',
    durationLabel: 'Duração estimada da atividade (minutos)',
    durationPlaceholder: 'Ex: 15',
    durationHelp: 'Este campo é estimativo. O limite real é definido em Configurações do Quiz.',
    previewTitle: 'Quiz de Preview Gratuito',
    previewDescription: 'Permitir que não-inscritos façam esta avaliação.',
  },
}

export const LESSON_MODAL_COPY: Record<LessonType, LessonModalCopy> = {
  video: {
    createTitle: 'Novo Conteúdo',
    editTitle: 'Editar Conteúdo',
    createDescription: 'Adicione um novo conteúdo ao módulo',
    editDescription: 'Atualize as informações do conteúdo',
    createSubmit: 'Adicionar Conteúdo',
  },
  text: {
    createTitle: 'Novo Conteúdo',
    editTitle: 'Editar Conteúdo',
    createDescription: 'Adicione um novo conteúdo ao módulo',
    editDescription: 'Atualize as informações do conteúdo',
    createSubmit: 'Adicionar Conteúdo',
  },
  file: {
    createTitle: 'Novo Conteúdo',
    editTitle: 'Editar Conteúdo',
    createDescription: 'Adicione um novo conteúdo ao módulo',
    editDescription: 'Atualize as informações do conteúdo',
    createSubmit: 'Adicionar Conteúdo',
  },
  quiz: {
    createTitle: 'Novo Quiz',
    editTitle: 'Editar Quiz',
    createDescription: 'Adicione um novo quiz ao módulo',
    editDescription: 'Atualize as informações do quiz',
    createSubmit: 'Adicionar Quiz',
  },
}
