import { defineStore } from 'pinia';
import { ref } from 'vue';
import client from '@/api/client';
import type { Project } from '@/types';

export interface CreateProjectInput {
  name: string;
  appKey: string;
}

export interface UpdateProjectInput {
  name?: string;
  appKey?: string;
}

export const useProjectsStore = defineStore('projects', () => {
  const projects = ref<Project[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchProjects() {
    loading.value = true;
    error.value = null;

    try {
      const { data } = await client.get<Project[]>('/projects');
      projects.value = data;
      return data;
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载项目失败';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function createProject(input: CreateProjectInput) {
    loading.value = true;
    error.value = null;

    try {
      const { data } = await client.post<Project>('/projects', input);
      projects.value.unshift(data);
      return data;
    } catch (e) {
      error.value = e instanceof Error ? e.message : '创建项目失败';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function updateProject(id: string, input: UpdateProjectInput) {
    loading.value = true;
    error.value = null;

    try {
      const { data } = await client.put<Project>(`/projects/${id}`, input);
      const index = projects.value.findIndex((p) => p.id === id);
      if (index !== -1) {
        projects.value[index] = data;
      }
      return data;
    } catch (e) {
      error.value = e instanceof Error ? e.message : '更新项目失败';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function deleteProject(id: string) {
    loading.value = true;
    error.value = null;

    try {
      await client.delete(`/projects/${id}`);
      projects.value = projects.value.filter((p) => p.id !== id);
    } catch (e) {
      error.value = e instanceof Error ? e.message : '删除项目失败';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  return {
    projects,
    loading,
    error,
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
  };
});
