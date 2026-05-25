package com.hsqe.hsqe_assistant_backend.services;

import com.hsqe.hsqe_assistant_backend.domain.Task;
import com.hsqe.hsqe_assistant_backend.entities.TaskEntity;
import com.hsqe.hsqe_assistant_backend.mappers.TaskMapper;
import com.hsqe.hsqe_assistant_backend.repositories.TaskRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import java.util.Collections;
import java.util.Optional;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class TaskServiceTest {
    @Mock
    private TaskRepository taskRepository;
    @Mock
    private TaskMapper taskMapper;
    @InjectMocks
    private TaskService taskService;

    @BeforeEach
    void setUp() { MockitoAnnotations.openMocks(this); }

    @Test
    void getAllTasks_returnsList() {
        TaskEntity entity = new TaskEntity();
        Task domain = new Task();
        when(taskRepository.findAll()).thenReturn(Collections.singletonList(entity));
        when(taskMapper.toDomainEntity(entity)).thenReturn(domain);
        List<Task> result = taskService.getAllTasks();
        assertEquals(1, result.size());
    }

    @Test
    void getTaskById_returnsTask() {
        TaskEntity entity = new TaskEntity();
        Task domain = new Task();
        when(taskRepository.findById(1L)).thenReturn(Optional.of(entity));
        when(taskMapper.toDomainEntity(entity)).thenReturn(domain);
        Optional<Task> result = taskService.getTaskById(1L);
        assertTrue(result.isPresent());
    }

    @Test
    void saveTask_savesAndReturnsTask() {
        Task domain = new Task();
        TaskEntity entity = new TaskEntity();
        when(taskMapper.toEntity(domain)).thenReturn(entity);
        when(taskRepository.save(entity)).thenReturn(entity);
        when(taskMapper.toDomainEntity(entity)).thenReturn(domain);
        Task result = taskService.saveTask(domain);
        assertNotNull(result);
    }

    @Test
    void deleteTask_deletesById() {
        doNothing().when(taskRepository).deleteById(1L);
        taskService.deleteTask(1L);
        verify(taskRepository, times(1)).deleteById(1L);
    }
}
