import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { Plus, Calendar, User, DollarSign, GripVertical, ChevronDown, ChevronRight, Trophy, XCircle } from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { TERMINAL_STAGES, type DealStage, type Deal } from '../../types/crm';

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateString: string | null): string => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
  });
};

interface DealCardProps {
  deal: Deal;
  index: number;
  onClick: () => void;
}

function DealCard({ deal, index, onClick }: DealCardProps) {
  return (
    <Draggable draggableId={deal.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          onClick={onClick}
          className={`
            bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700
            p-3 mb-2 cursor-pointer transition-all
            hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600
            ${snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-500 ring-opacity-50' : ''}
          `}
        >
          <div className="flex items-start gap-2">
            <div
              {...provided.dragHandleProps}
              className="mt-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-grab active:cursor-grabbing"
            >
              <GripVertical className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-900 dark:text-white truncate text-sm">
                {deal.name}
              </h4>

              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-1.5 text-sm">
                  <DollarSign className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    {formatCurrency(deal.amount)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{formatDate(deal.expectedCloseDate)}</span>
                </div>

                {deal.ownerName && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <User className="w-3.5 h-3.5" />
                    <span className="truncate">{deal.ownerName}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}

interface PipelineColumnProps {
  stage: DealStage;
  deals: Deal[];
  onCardClick: (dealId: string) => void;
}

function PipelineColumn({ stage, deals, onCardClick, stageConfig }: PipelineColumnProps & { stageConfig: { label: string; headerBg: string } }) {
  const config = stageConfig;
  const totalValue = deals.reduce((sum, deal) => sum + deal.amount, 0);

  return (
    <div className="flex-shrink-0 w-72">
      <div className={`${config.headerBg} rounded-t-lg px-3 py-2`}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {config.label}
          </h3>
          <span className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-medium px-2 py-0.5 rounded-full">
            {deals.length}
          </span>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {formatCurrency(totalValue)}
        </div>
      </div>

      <Droppable droppableId={stage}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`
              bg-gray-50 dark:bg-gray-900/50 rounded-b-lg p-2 min-h-[400px]
              transition-colors
              ${snapshot.isDraggingOver ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
            `}
          >
            {deals.map((deal, index) => (
              <DealCard
                key={deal.id}
                deal={deal}
                index={index}
                onClick={() => onCardClick(deal.id)}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}

interface ClosedDealsSection {
  title: string;
  icon: React.ReactNode;
  deals: Deal[];
  colorClass: string;
  onCardClick: (dealId: string) => void;
}

function ClosedDealsSection({ title, icon, deals, colorClass, onCardClick }: ClosedDealsSection) {
  const [isExpanded, setIsExpanded] = useState(false);
  const totalValue = deals.reduce((sum, deal) => sum + deal.amount, 0);

  if (deals.length === 0) return null;

  return (
    <div className={`border rounded-lg ${colorClass}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-opacity-80 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium">{title}</span>
          <span className="text-sm opacity-75">({deals.length})</span>
          <span className="text-sm ml-2">{formatCurrency(totalValue)}</span>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-5 h-5" />
        ) : (
          <ChevronRight className="w-5 h-5" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {deals.map((deal) => (
            <div
              key={deal.id}
              onClick={() => onCardClick(deal.id)}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3 cursor-pointer hover:shadow-md transition-shadow"
            >
              <h4 className="font-medium text-gray-900 dark:text-white truncate text-sm">
                {deal.name}
              </h4>
              <div className="mt-2 flex items-center gap-1.5 text-sm">
                <DollarSign className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                <span className="font-semibold text-green-600 dark:text-green-400">
                  {formatCurrency(deal.amount)}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <Calendar className="w-3.5 h-3.5" />
                <span>Cerrado: {formatDate(deal.actualCloseDate)}</span>
              </div>
              {deal.ownerName && (
                <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <User className="w-3.5 h-3.5" />
                  <span className="truncate">{deal.ownerName}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function DealPipeline() {
  const navigate = useNavigate();
  const { deals, updateDealStage, loading, pipelineStages, getStageConfig } = useCRM();

  const pipelineStageNames = useMemo(() => pipelineStages.map(s => s.name), [pipelineStages]);

  const dealsByStage = useMemo(() => {
    const grouped: Record<string, Deal[]> = {};
    // Initialize all pipeline + terminal stages
    pipelineStageNames.forEach(s => { grouped[s] = []; });
    grouped['ganado'] = [];
    grouped['perdido'] = [];

    deals.forEach((deal) => {
      if (grouped[deal.stage]) {
        grouped[deal.stage].push(deal);
      }
    });

    return grouped;
  }, [deals, pipelineStageNames]);

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStage = destination.droppableId as DealStage;

    // Only allow dragging within pipeline stages (not terminal)
    if (!pipelineStageNames.includes(newStage)) return;

    await updateDealStage(draggableId, newStage);
  };

  const handleCardClick = (dealId: string) => {
    navigate(`/crm/deals/${dealId}`);
  };

  const handleNewDeal = () => {
    navigate('/crm/deals/new');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Pipeline de Ventas
        </h1>
        <button
          onClick={handleNewDeal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nueva Oportunidad
        </button>
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {pipelineStageNames.map((stage) => (
            <PipelineColumn
              key={stage}
              stage={stage}
              deals={dealsByStage[stage] || []}
              onCardClick={handleCardClick}
              stageConfig={getStageConfig(stage)}
            />
          ))}
        </div>
      </DragDropContext>

      {/* Won/Lost Sections */}
      <div className="space-y-4">
        <ClosedDealsSection
          title="Oportunidades Ganadas"
          icon={<Trophy className="w-5 h-5 text-green-600" />}
          deals={dealsByStage.ganado}
          colorClass="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200"
          onCardClick={handleCardClick}
        />

        <ClosedDealsSection
          title="Oportunidades Perdidas"
          icon={<XCircle className="w-5 h-5 text-red-600" />}
          deals={dealsByStage.perdido}
          colorClass="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200"
          onCardClick={handleCardClick}
        />
      </div>
    </div>
  );
}
