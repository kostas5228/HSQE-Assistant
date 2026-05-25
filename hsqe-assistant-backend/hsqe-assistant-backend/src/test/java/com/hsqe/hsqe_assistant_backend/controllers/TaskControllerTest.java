package com.hsqe.hsqe_assistant_backend.controllers;

import com.hsqe.hsqe_assistant_backend.domain.Task;
import com.hsqe.hsqe_assistant_backend.dto.TaskDTO;
import com.hsqe.hsqe_assistant_backend.mappers.TaskMapper;
import com.hsqe.hsqe_assistant_backend.services.TaskService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.ResponseEntity;
import java.util.Collections;
import java.util.Optional;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class TaskControllerTest {
    @Mock
    private TaskService taskService;
    @Mock
    private TaskMapper taskMapper;
    @InjectMocks
    private TaskController taskController;

    @BeforeEach
    void setUp() { MockitoAnnotations.openMocks(this); }

    @Test
    void getAllTasks_returnsList() {
        Task domain = new Task();
        TaskDTO dto = new TaskDTO();
        when(taskService.getAllTasks()).thenReturn(Collections.singletonList(domain));
        when(taskMapper.toDTO(domain)).thenReturn(dto);
        List<TaskDTO> result = taskController.getAllTasks();
        assertEquals(1, result.size());
    }

    @Test
    void getTaskById_found() {
        Task domain = new Task();
        TaskDTO dto = new TaskDTO();
        when(taskService.getTaskById(1L)).thenReturn(Optional.of(domain));
        when(taskMapper.toDTO(domain)).thenReturn(dto);
        ResponseEntity<TaskDTO> response = taskController.getTaskById(1L);
        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
    }

    @Test
    void getTaskById_notFound() {
        when(taskService.getTaskById(1L)).thenReturn(Optional.empty());
        ResponseEntity<TaskDTO> response = taskController.getTaskById(1L);
        assertEquals(404, response.getStatusCode().value());
    }

    @Test
    void createTask_returnsCreated() {
        TaskDTO dto = new TaskDTO();
        Task domain = new Task();
        when(taskMapper.toDomain(dto)).thenReturn(domain);
        when(taskService.saveTask(domain)).thenReturn(domain);
        when(taskMapper.toDTO(domain)).thenReturn(dto);
        TaskDTO result = taskController.createTask(dto);
        assertNotNull(result);
    }

    @Test
    void deleteTask_returnsNoContent() {
        doNothing().when(taskService).deleteTask(1L);
        ResponseEntity<Void> response = taskController.deleteTask(1L);
        assertEquals(204, response.getStatusCode().value());
    }
}
