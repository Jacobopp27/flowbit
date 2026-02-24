import { useState, useEffect } from 'react';
import { ArrowLeft, Play, Pause, CheckCircle } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import projectService, { ProjectStageDetail } from '@/services/projects';

export function WorkStageDetail() {
  const { projectStageId } = useParams();
  const [stageDetail, setStageDetail] = useState<ProjectStageDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (projectStageId) {
      loadStageDetail();
    }
  }, [projectStageId]);

  const loadStageDetail = async () => {
    try {
      const detail = await projectService.getMyWorkStageDetail(parseInt(projectStageId!));
      setStageDetail(detail as any);
    } catch (error) {
      console.error('Error loading stage detail:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Cargando detalle de la etapa...</div>
      </div>
    );
  }

  if (!stageDetail) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Error al cargar la etapa</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/work">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Stage Work Detail
          </h1>
          <p className="text-muted-foreground">
            Update progress for stage #{projectStageId}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Stage Information</CardTitle>
            <CardDescription>
              Details about this workflow stage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              Stage name, project, and description will be displayed here
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full" variant="default">
              <Play className="mr-2 h-4 w-4" />
              Start Timer
            </Button>
            <Button className="w-full" variant="secondary">
              <Pause className="mr-2 h-4 w-4" />
              Pause Timer
            </Button>
            <Button className="w-full" variant="outline">
              <CheckCircle className="mr-2 h-4 w-4" />
              Mark Complete
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quantity Progress</CardTitle>
          <CardDescription>
            Update units completed for this stage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Quantity input (qty_required vs qty_done) will be displayed here
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notes & Attachments</CardTitle>
          <CardDescription>
            Add work notes or attach files
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Notes editor and file upload interface will be displayed here
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
