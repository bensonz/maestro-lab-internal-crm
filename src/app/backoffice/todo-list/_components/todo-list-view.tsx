'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Search,
  DollarSign,
  FileText,
  Users,
  Folder,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'

interface Task {
  id: string
  title: string
  client: string
  category: string
  dueIn: string
  overdue: boolean
}

interface AgentTasks {
  agentId: string
  agentName: string
  tasks: Task[]
}

interface TodoListViewProps {
  agentTasks: AgentTasks[]
}

const categories = [
  { id: 'all', label: 'All Tasks', icon: Folder },
  { id: 'transaction', label: 'Transaction', icon: DollarSign },
  { id: 'sales', label: 'Sales Interaction', icon: FileText },
  { id: 'manager', label: 'Manager Assigned', icon: Users },
  { id: 'other', label: 'Other', icon: Folder },
]

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

function getCategoryIcon(category: string) {
  switch (category) {
    case 'transaction':
      return <DollarSign className="h-4 w-4 text-emerald-500" />
    case 'sales':
      return <FileText className="h-4 w-4 text-blue-500" />
    case 'manager':
      return <Users className="h-4 w-4 text-purple-500" />
    default:
      return <Folder className="h-4 w-4 text-slate-400" />
  }
}

export function TodoListView({ agentTasks }: TodoListViewProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [expandedAgents, setExpandedAgents] = useState<string[]>(
    agentTasks.map((a) => a.agentId),
  )

  const toggleAgent = (agentId: string) => {
    setExpandedAgents((prev) =>
      prev.includes(agentId)
        ? prev.filter((id) => id !== agentId)
        : [...prev, agentId],
    )
  }

  const filteredAgentTasks = agentTasks
    .map((agent) => ({
      ...agent,
      tasks: agent.tasks.filter((task) => {
        const matchesSearch =
          task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
          agent.agentName.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesCategory =
          selectedCategory === 'all' || task.category === selectedCategory
        return matchesSearch && matchesCategory
      }),
    }))
    .filter((agent) => agent.tasks.length > 0)

  // Calculate category counts
  const categoryCounts = categories.reduce(
    (acc, cat) => {
      if (cat.id === 'all') {
        acc[cat.id] = agentTasks.reduce((sum, a) => sum + a.tasks.length, 0)
      } else {
        acc[cat.id] = agentTasks.reduce(
          (sum, a) => sum + a.tasks.filter((t) => t.category === cat.id).length,
          0,
        )
      }
      return acc
    },
    {} as Record<string, number>,
  )

  return (
    <>
      {/* Filters */}
      <div className="flex gap-4 items-center">
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList className="bg-slate-800">
            {categories.map((cat) => (
              <TabsTrigger
                key={cat.id}
                value={cat.id}
                className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
              >
                <cat.icon className="h-4 w-4 mr-1" />
                {cat.label}
                {categoryCounts[cat.id] > 0 && (
                  <span className="ml-1 text-xs">
                    ({categoryCounts[cat.id]})
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search tasks, clients, or agents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 bg-slate-900 border-slate-700 text-white max-w-md"
        />
      </div>

      {/* Agent Task Groups */}
      <div className="space-y-4">
        {filteredAgentTasks.length === 0 ? (
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="py-12">
              <p className="text-center text-slate-400">
                {agentTasks.length === 0
                  ? 'No tasks assigned'
                  : 'No tasks match your filters'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredAgentTasks.map((agent) => (
            <Card key={agent.agentId} className="bg-slate-900 border-slate-800">
              <CardHeader
                className="cursor-pointer hover:bg-slate-800/50 transition-colors"
                onClick={() => toggleAgent(agent.agentId)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {expandedAgents.includes(agent.agentId) ? (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    )}
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-emerald-600 text-white text-sm font-medium">
                      {getInitials(agent.agentName)}
                    </div>
                    <CardTitle className="text-white">
                      Agent: {agent.agentName}
                    </CardTitle>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-slate-600 text-slate-300"
                  >
                    {agent.tasks.length} tasks
                  </Badge>
                </div>
              </CardHeader>
              {expandedAgents.includes(agent.agentId) && (
                <CardContent className="space-y-2 pt-0">
                  {agent.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {getCategoryIcon(task.category)}
                        <div>
                          <p className="text-white font-medium">{task.title}</p>
                          <p className="text-xs text-slate-400">
                            {task.client}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          task.overdue
                            ? 'border-red-600 text-red-500'
                            : 'border-amber-600 text-amber-500'
                        }
                      >
                        {task.overdue ? `${task.dueIn} overdue` : task.dueIn}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>
    </>
  )
}
